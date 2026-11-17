import { db } from ".././prisma/db";

export const generateRecommendations = async (userId: string) => {
  //find user profile//
  const profile = await db.orm.public.Profile.where({ userId }).first();

  if (!profile) {
    throw new Error("Profile not found.");
  }

  //find existing Recommendations//
  const existingRecommendations = await db.orm.public.Recommendation.where({
    userId,
  }).all();

  //exclude jobs the user already applied or dismissed//
  const excludeJobIds = existingRecommendations
    .filter(
      (recommendation) =>
        recommendation.status === "applied" ||
        recommendation.status === "dismissed",
    )
    .map((recommendation) => recommendation.jobId);

  //check the AI service urll//
  const aiServiceUrl = process.env.AISERVICE_URL;
  if (!aiServiceUrl) {
    throw new Error("Ai service url not defined.");
  }

  // generate recommendations//
  const response = await fetch(`${aiServiceUrl}/api/v1/recommendation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ profile, excludeJobIds }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `AI service responded with status: ${response.status} ${body}`,
    );
  }

  const data = await response.json();

  //validate Ai response//
  if (!Array.isArray(data.recommendations)) {
    throw new Error("Invalid AI recommendation response.");
  }

  //save each recommendation//
  for (const recommendation of data.recommendations) {
    //extract jobid and score//
    const { job_id: jobId, score } = recommendation;

    if (
      typeof jobId !== "string" ||
      typeof score !== "number" ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > 100
    ) {
      console.warn("Skipping invalid recommendation:", recommendation);
      continue;
    }

    //check malformed Ai Output//
    if (excludeJobIds.includes(jobId)) {
      console.warn("Skipping malformed AI output (existing recommendations)");
      continue;
    }

    //validate the returned job//
    const job = await db.orm.public.Job.where({ id: jobId }).first();
    if (!job) {
      console.warn(`Skipping unknown job ID: ${jobId}`);
      continue;
    }

    //check if user -job pair exists//
    const existingPair = await db.orm.public.Recommendation.where({
      userId,
      jobId,
    }).first();
    // avoid overwriting already applied or dismissed job recommendation//
    if (
      existingPair?.status === "dismissed" ||
      existingPair?.status === "applied"
    ) {
      console.warn("Skipping applied or dismissed (user,job) pair");
      continue;
    }
    if (existingPair) {
      //update recommendation score//
      await db.orm.public.Recommendation.where({
        id: existingPair.id,
      }).update({ score });
    } else {
      //create the recommendation//
      await db.orm.public.Recommendation.create({
        userId,
        jobId,
        score,
        status: "new",
      });
    }
  }
};
