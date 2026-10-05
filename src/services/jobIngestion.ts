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
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
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
      //check if job already exists//
      const existingJob = await db.orm.public.Job.where({
        externalJobId: job.job_id,
      }).first();

      if (existingJob) {
        continue;
      }

      //create new job in db//
      await db.orm.public.Job.create({
        externalJobId: job.job_id,
        title: job.job_title,
        description: job.job_description,
        location: job.job_location,
        applyUrl: job.job_apply_link,
        employmentType: job.job_employment_type,
        minSalary: job.job_min_salary ?? 0,
        maxSalary: job.job_max_salary ?? 0,
        requiredSkills: job.required_technologies ?? [],
        company: job.employer_name,
        companyLogo: job.employer_logo ?? "",
        companyWebsite: job.employer_website ?? "",
        postedAt: Temporal.Instant.from(job.job_posted_at_datetime_utc),
        aiIndexed: false,
      });
      savedCount++;
    }

    console.log(`Suceessfully saved ${savedCount} jobs in db.`);
  } catch (err) {
    console.error("Error while fetching jobs:", err);
  }
};
