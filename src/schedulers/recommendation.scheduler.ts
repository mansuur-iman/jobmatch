import cron from "node-cron";
import { db } from "../prisma/db";
import { generateRecommendations } from "../services/recommender";

let isRunning = false;

export const recommendationScheduler = () => {
  cron.schedule(
    "0 3 * * *",
    async () => {
      if (isRunning) {
        console.log("Previous recommendation run is still active.");
        return;
      }

      isRunning = true;

      try {
        console.log("Starting recommendation scheduler at 3 AM.");

        const profiles = await db.orm.public.Profile.all();

        for (const profile of profiles) {
          try {
            await generateRecommendations(profile.userId);

            console.log(
              `Recommendations generated for userId: ${profile.userId}`,
            );
          } catch (err) {
            console.error(
              `Error generating recommendations for userId: ${profile.userId}`,
              err,
            );
          }
        }

        console.log("Recommendation scheduler completed.");
      } catch (err) {
        console.error("Error in recommendation scheduler:", err);
      } finally {
        isRunning = false;
      }
    },
    {
      timezone: "Africa/Nairobi",
    },
  );
};
