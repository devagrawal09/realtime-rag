"use socket";

import { createOpenAI } from "@ai-sdk/openai";
import { embed, generateText } from "ai";
import { createResource } from "solid-js";
import { EventLog } from "../../socket/events";
import { createServerEventLog } from "../../socket/events/socket";
import { createSocketMemo } from "../../socket/lib/shared";
import { createPersistedSignal } from "../../socket/persisted";
import { projectsCollection, storage } from "./db";

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
  }

  const { serverEvents, appendEvent } = createServerEventLog(
    () => `123`,
    hackathonLogs,
    setHackathonLogs,
    (e) => {
      if (e.type === "ProjectSubmitted") {
        summarizeProject(e.projectId);
        generateProjectEmbedding(e.projectId);
      }
      if (e.type === "ProjectReviewed") {
        summarizeProject(e.projectId);
      }
    }
  );

  return {
    serverEvents: createSocketMemo(serverEvents),
    appendEvent,
  };
};

export const useSearch = (query: () => string | undefined) => {
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
