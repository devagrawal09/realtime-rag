export type CategoryCreated = {
  type: `CategoryCreated`;
  title: string;
  categoryId: string;
};

export type JudgeAssigned = {
  type: `JudgeAssigned`;
  judgeId: string;
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

export type ProjectJudged = {
  type: `ProjectJudged`;
  projectId: string;
  judgeId: string;
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

export type CategoryEvents =
  | CategoryCreated
  | JudgeAssigned
  | CategorySummaryUpdated;

export type ProjectEvents =
  | ProjectSubmitted
  | ProjectReviewed
  | ProjectJudged
  | ProjectSummaryUpdated;

export type HackathonEvents = CategoryEvents | ProjectEvents;
