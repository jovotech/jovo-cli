export * from './Interfaces';

/**
 * Tries to parse errors from the serverless CLI.
 * @param output - Output from the serverless CLI, potentially containing an error message.
 */
export function getServerlessError(output: string): string {
  const supportToken: string = 'Get Support --------------------------------------------';
  const errorMatch: RegExpMatchArray | null = output.match(/Error\s-+/);
  const errorToken: string = errorMatch ? errorMatch[0] : '';
  const errorMessage: string = output.substring(
    output.indexOf(errorToken) + errorToken.length,
    output.indexOf(supportToken),
  );
  return errorMessage.trim();
}
