import { db } from ".././prisma/db";

const fetchAndStoreJobs = async () => {
  //fetching url//
  const url = "https://rapidapi.com";
  //api key//
  const apiKey = process.env.JSEARCH_API_KEY;

  if (!apiKey) {
    throw new Error("API KEY not found.");
  }

  try {
    console.log("Fetching fresh jobs from Jsearch...");
    //fetch jobs/
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Job search API responded with error status: ${response.status} `,
      );
    }

    //grap the response//
    const result = await response.json();

    //create a job list//
    const jobList = result.data || [];

    let savedCount = 0;

    for (const job of jobList) {
      //save each job to db//

      await db.orm.public.Job.create({});
    }
  } catch (err) {
    console.error("Error while fetching jobs:", err);
  }
};
