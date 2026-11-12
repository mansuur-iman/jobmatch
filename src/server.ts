import "dotenv/config";
import { app } from "./app";
import { recommendationScheduler } from "./schedulers/recommendation.scheduler";

const PORT = process.env.PORT;

recommendationScheduler();

app.listen(PORT, () => {
  console.log(`running server on: ${PORT}`);
});
