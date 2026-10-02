using System.Text;

namespace MicrogridApi.Common;

// Writes CSV that opens cleanly in Excel: UTF-8 with BOM, CRLF line endings, every cell quoted.
// Cells starting with = + - @ get a leading apostrophe so a spreadsheet never runs them as
// formulas (CSV injection).
public static class CsvWriter
{
    public static byte[] Write(IReadOnlyList<string> header, IEnumerable<IReadOnlyList<string?>> rows)
    {
        var builder = new StringBuilder();
        AppendRow(builder, header);

        foreach (var row in rows)
        {
            AppendRow(builder, row);
        }

        var preamble = Encoding.UTF8.GetPreamble();
        var body = Encoding.UTF8.GetBytes(builder.ToString());
        return [.. preamble, .. body];
    }

    public static string Escape(string? value)
    {
        var text = value ?? string.Empty;

        if (text.TrimStart() is { Length: > 0 } trimmed && trimmed[0] is '=' or '+' or '-' or '@')
        {
            text = "'" + text;
        }

        return "\"" + text.Replace("\"", "\"\"") + "\"";
    }

    private static void AppendRow(StringBuilder builder, IReadOnlyList<string?> cells)
    {
        builder.AppendJoin(',', cells.Select(Escape));
        builder.Append("\r\n");
    }
}
