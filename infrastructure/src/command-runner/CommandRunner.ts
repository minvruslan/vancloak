import { execa, type Options } from "execa"
import { CommandRunnerMode } from "./constants/index.js"
import { CommandRunnerImage } from "./image/CommandRunnerImage.js"
import { assertCommandRunnerImageExists } from "./utils/index.js"

const FORWARDED_ENVIRONMENT_VARIABLE_NAMES = ["PATH", "LANG", "ANSIBLE_COLLECTIONS_PATH"]

export class CommandRunner {
  private static imageVerified = false

  static async run(
    dockerFlags: string[],
    command: string[],
    options: Options = {},
  ): Promise<string> {
    if (CommandRunnerMode === "direct") {
      const [file, ...commandArguments] = command
      if (file === undefined) throw new Error("Command runner received an empty command.")

      const { stdout } = await execa(file, commandArguments, {
        ...options,
        extendEnv: false,
        env: { ...CommandRunner.buildDirectEnvironment(), ...options.env },
      })
      return CommandRunner.readStdout(stdout, command, options)
    }

    if (!CommandRunner.imageVerified) {
      await assertCommandRunnerImageExists(CommandRunnerImage.name)
      CommandRunner.imageVerified = true
    }

    const { env, ...dockerOptions } = options
    const environmentFlags = Object.entries(env ?? {}).flatMap(([name, value]) => [
      "-e",
      `${name}=${String(value)}`,
    ])

    const { stdout } = await execa(
      "docker",
      [
        "run",
        "--rm",
        "--pull=never",
        ...environmentFlags,
        ...dockerFlags,
        CommandRunnerImage.name,
        ...command,
      ],
      dockerOptions,
    )

    return CommandRunner.readStdout(stdout, command, options)
  }

  private static buildDirectEnvironment(): Record<string, string> {
    const environment: Record<string, string> = { HOME: "/tmp" }

    for (const name of FORWARDED_ENVIRONMENT_VARIABLE_NAMES) {
      const value = process.env[name]
      if (value !== undefined) environment[name] = value
    }

    return environment
  }

  private static readStdout(stdout: unknown, command: string[], options: Options): string {
    if (typeof stdout === "string") return stdout
    if (options.stdout === "inherit") return ""

    throw new Error(`No stdout captured from: ${command.join(" ")}.`)
  }
}
