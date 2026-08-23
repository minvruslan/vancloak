export function quoteShellArgument(argument: string): string {
  return `'${argument.replaceAll("'", "'\\''")}'`
}
