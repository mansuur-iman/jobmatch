import { db } from ".././prisma/db";

export const fetchAndStoreJobsForProfile = async (
  primaryRole: string,
  location: string = "Remote",
) => {
  const max_jobs = 10;
  //validate params//
  if (!primaryRole || !location) {
    console.error("Params not provided.");
    return;
  }
  //build searchQuery//
  const searchQuery = `${primaryRole} ${location}`.trim();
  //fetching url//
  const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(searchQuery)}&num_pages=1`;
  //api key//
  const apiKey = process.env.JSEARCH_API_KEY;

  if (!apiKey) {
    console.error("API KEY not found.");
    return;
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
    const jobList = (result.data || []).slice(0, max_jobs);

    let savedCount = 0;

    for (const job of jobList) {
      //validate job id//
      if (!job.job_id) {
        console.warn(`Skipping unknown job : ${job.job_id}`);
        continue;
      }
      //check if job already exists//
      const existingJob = await db.orm.public.Job.where({
        externalJobId: job.job_id,
      }).first();

      if (existingJob) {
        console.warn("Skipping existing job.");
        continue;
      }
      //format location//
      const formattedLocation = job.job_city
        ? `${job.job_city} ${job.job_country}`
        : (job.job_country ?? location);

      //create new job in db//
      await db.orm.public.Job.create({
        externalJobId: job.job_id,
        title: job.job_title,
        description: job.job_description,
        location: formattedLocation,
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
