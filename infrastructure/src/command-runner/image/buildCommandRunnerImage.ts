import { execa } from "execa"
import { CommandRunnerImageDirectoryPath } from "./constants/index.js"
import { CommandRunnerImage } from "./CommandRunnerImage.js"

await execa("docker", ["build", "-t", CommandRunnerImage.name, CommandRunnerImageDirectoryPath], {
  stdio: "inherit",
})
