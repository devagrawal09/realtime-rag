import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";

export const storage = createStorage({
  driver: fsDriver({ base: "./tmp" }),
});

import { DataAPIClient } from "@datastax/astra-db-ts";

const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN);
export const db = () => client.db(process.env.ASTRA_DB_API_ENDPOINT!);
export const projectsCollection = () =>
  db().collection<{ $vector: number[]; title: string }>("hackathon_projects");

(async function () {
  const existing = (await db().listCollections()).find(
    (c) => c.name === "hackathon_projects"
  );
  if (!existing)
    await db().createCollection("hackathon_projects", {
      vector: {
        dimension: 1536,
        metric: "dot_product",
      },
      indexing: {
        allow: ["*"],
      },
    });
})();
