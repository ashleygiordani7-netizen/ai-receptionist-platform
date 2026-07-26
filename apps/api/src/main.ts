import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { createLogger } from "@platform/logger";
import { AppModule } from "./app.module";

const logger = createLogger({ name: "api" });

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  const port = Number(process.env["PORT"] ?? 3000);
  await app.listen(port, "0.0.0.0");

  logger.info("api server started", { port });
}

bootstrap().catch((error: unknown) => {
  logger.error("api server failed to start", { err: error });
  process.exit(1);
});
