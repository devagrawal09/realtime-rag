"use socket";

import { createOpenAI } from "@ai-sdk/openai";
import { embed, generateText } from "ai";
import { createEffect, createResource } from "solid-js";
import { EventLog } from "../../socket/events";
import { createServerEventLog } from "../../socket/events/socket";
import { createSocketMemo } from "../../socket/lib/shared";
import { createPersistedSignal } from "../../socket/persisted";
import { projectsCollection, storage } from "./db";
import { set, z } from "zod";
import { setTimeout } from "timers/promises";

const openai = createOpenAI({
  compatibility: "strict",
  apiKey: process.env.OPENAI_API_KEY,
});

export type CategoryCreated = {
  type: `CategoryCreated`;
  title: string;
  categoryId: string;
};

export type ProjectSubmitted = {
  type: `ProjectSubmitted`;
  projectId: string;
  categoryId: string;
  title: string;
  description: string;
  author: string;
};

export type ProjectReviewed = {
  type: `ProjectReviewed`;
  projectId: string;
  author: string;
  rating: number;
  comment: string;
};
export type ProjectSummaryUpdated = {
  type: `ProjectSummaryUpdated`;
  projectId: string;
  summary: string;
};

export type CategorySummaryUpdated = {
  type: `CategorySummaryUpdated`;
  categoryId: string;
  summary: string;
};

export type CategoryEvents = CategoryCreated | CategorySummaryUpdated;

export type ProjectEvents =
  | ProjectSubmitted
  | ProjectReviewed
  | ProjectSummaryUpdated;

export type HackathonEvents = CategoryEvents | ProjectEvents;

const [hackathonLogs, setHackathonLogs] = createPersistedSignal<
  Record<string, EventLog<HackathonEvents>>
>(storage, `hackathon-logs`, {});

const [randomData, setRandomData] = createPersistedSignal<RandomData>(
  storage,
  `random-data`
);

let seeded = true;
// let limit = 0;

export const useGallery = () => {
  async function summarizeProject(projectId: string) {
    const project = serverEvents()
      .filter((e) => e.type === "ProjectSubmitted")
      .find((p) => p.projectId === projectId);

    if (!project) return;

    const category = serverEvents()
      .filter((e) => e.type === "CategoryCreated")
      .find((c) => c.categoryId === project.categoryId);

    if (!category) return;

    const reviews = serverEvents()
      .filter((e) => e.type === "ProjectReviewed")
      .filter((r) => r.projectId === projectId);

    const prompt = `Generate a 3 sentence summary of a project submitted to a hackathon. The project's title is "${
      project.title
    }", and here's the description:\n"${
      project.description
    }"\n\nThis project was submitted to the category "${category.title}". ${
      reviews.length > 0
        ? `Here are the reviews for this project:\n${reviews
            .map(
              (r) =>
                `"${r.comment}" - ${r.author} rated this project ${r.rating} out of 5.`
            )
            .join("\n")}`
        : `There are no reviews for this project yet.`
    }`;

    // await setTimeout(500 * limit);
    const { text } = await generateText({
      model: openai("gpt-4-turbo"),
      prompt,
    });

    appendEvent(
      {
        type: `ProjectSummaryUpdated`,
        projectId,
        summary: text,
        _id: crypto.randomUUID(),
      },
      serverEvents().length
    );
  }

  async function generateProjectEmbedding(projectId: string) {
    const project = serverEvents()
      .filter((e) => e.type === "ProjectSubmitted")
      .find((p) => p.projectId === projectId);

    if (!project) return;

    const category = serverEvents()
      .filter((e) => e.type === "CategoryCreated")
      .find((c) => c.categoryId === project.categoryId);

    if (!category) return;

    const reviews = serverEvents()
      .filter((e) => e.type === "ProjectReviewed")
      .filter((r) => r.projectId === projectId);

    const prompt = `Project Title: "${project.title}"\nProject Description: "${
      project.description
    }"\nProject Category: "${category.title}"\nProject Reviews: ${
      reviews.length
        ? reviews.map((r) => `${r.author} (${r.rating}/5): ${r.comment}`)
        : `No reviews yet`
    }`;

    // await setTimeout(500 * limit);
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: prompt,
    });

    const existing = await projectsCollection().findOne({ _id: projectId });
    if (!existing) {
      await projectsCollection().insertOne({
        _id: projectId,
        $vector: embedding,
        title: project.title,
      });
    } else {
      await projectsCollection().updateOne(
        { _id: projectId },
        { $set: { $vector: embedding } }
      );
    }

    console.log(`Generated embedding for project ${project.title}`);
  }

  const { serverEvents, appendEvent } = createServerEventLog(
    () => `123`,
    hackathonLogs,
    setHackathonLogs,
    (e) => {
      console.log(`event`, e);
      if (e.type === "ProjectSubmitted") {
        summarizeProject(e.projectId);
        generateProjectEmbedding(e.projectId);
      }
      if (e.type === "ProjectReviewed") {
        summarizeProject(e.projectId);
      }
    }
  );

  async function generateRandomData() {
    console.log(`generating random data`);
    // const { partialObjectStream } = streamObject({
    //   model: openai("gpt-4o"),
    //   schema: z.object({
    //     categories: z.array(
    //       z.object({
    //         categoryId: z.string(),
    //         title: z.string(),
    //         projects: z.array(
    //           z.object({
    //             projectId: z.string(),
    //             title: z.string(),
    //             description: z.string(),
    //             author: z.string(),
    //             reviews: z.array(
    //               z.object({
    //                 author: z.string(),
    //                 rating: z.number().min(1).max(5),
    //                 comment: z.string(),
    //               })
    //             ),
    //           })
    //         ),
    //       })
    //     ),
    //   }),
    //   prompt: `For a sample hackathon, generate 5 prize categories, 10 projects in each category, and 5 reviews for each project. The project descriptions should be very detailed, atleast 2 paragraphs, and should consist of the motivation for the project, brief overview of functionality and target users, technical and implementation details, as well as potential improvements for the future. Each review should also be detailed with 5-7 sentences, and should range from negative to positive for each project.`,
    // });
    // for await (const partialObject of partialObjectStream) {
    //   console.log(`received partial object`);
    //   setRandomData(partialObject);
    // }
    console.log(`done generating random data`);
  }

  createEffect(() => {
    const data = randomData();
    if (!data || !data.categories.length) return;
    if (seeded) return;
    seeded = true;
    console.log(`seeding data`, data.categories.length);
    data?.categories.forEach((c) => {
      appendEvent(
        {
          type: `CategoryCreated`,
          categoryId: c.categoryId,
          title: c.title,
          _id: crypto.randomUUID(),
        },
        serverEvents().length
      );

      c.projects.forEach((p) => {
        appendEvent(
          {
            type: `ProjectSubmitted`,
            projectId: p.projectId,
            categoryId: c.categoryId,
            title: p.title,
            description: p.description,
            author: p.author,
            _id: crypto.randomUUID(),
          },
          serverEvents().length
        );

        p.reviews.forEach((r) => {
          appendEvent(
            {
              type: `ProjectReviewed`,
              projectId: p.projectId,
              author: r.author,
              rating: r.rating,
              comment: r.comment,
              _id: crypto.randomUUID(),
            },
            serverEvents().length
          );
        });
      });
    });
  });

  return {
    serverEvents: createSocketMemo(serverEvents),
    appendEvent,
    generateRandomData,
  };
};

export const useSearch = (query: () => string | undefined) => {
  createEffect(() => console.log(`query`, query()));

  const [results] = createResource(query, async (q) => {
    if (!q) return [];

    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: q,
    });

    const searchResults = await projectsCollection()
      .find(
        {},
        {
          sort: { $vector: embedding },
          limit: 10,
          includeSimilarity: true,
        }
      )
      .toArray();

    return searchResults;
  });

  return createSocketMemo(results);
};

const randomDataSchema = z.object({
  categories: z.array(
    z.object({
      categoryId: z.string(),
      title: z.string(),
      projects: z.array(
        z.object({
          projectId: z.string(),
          title: z.string(),
          description: z.string(),
          author: z.string(),
          reviews: z.array(
            z.object({
              author: z.string(),
              rating: z.number().min(1).max(5),
              comment: z.string(),
            })
          ),
        })
      ),
    })
  ),
});
type RandomData = z.infer<typeof randomDataSchema>;
