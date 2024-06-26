import * as c from "https://deno.land/std@0.220.1/fmt/colors.ts";
import { format } from "https://deno.land/std@0.220.1/datetime/mod.ts";
import sanitize from "https://deno.land/x/sanitize_filename@1.2.1/mod.ts";
import { stringify } from "https://deno.land/x/xml@2.1.3/mod.ts";
import { metrodreaminToKML } from "./kml.ts";
import { getData } from "./metrodreamin.ts";

function main() {
	const { args } = Deno;

	const { onlyLines, onlyStations, urls } = args.reduce(({ onlyLines, onlyStations, urls }, arg) => {
		const urlRegex = new RegExp("https://metrodreamin.com/view/[a-zA-Z0-9]{40,40}", "g");
		switch(true) {
			case arg === "--only-lines": onlyLines = true; break;
			case arg === "--only-stations": onlyStations = true; break;
			case urlRegex.test(arg): urls.push(arg); break;
			default: console.warn(`Invalid argument: "${arg}". Skipping...`);
		}
		return { onlyLines, onlyStations, urls };
	}, { onlyLines: false, onlyStations: false, urls: [] as string[] });

	if(!urls.length) exitError("No url provided.");
	if(onlyLines && onlyStations) exitError("Cannot use both --only-lines and --only-stations.");

	const promises = urls
		.map(async (url, i) => {
			const metrodreaminObj = await getData(url);

			const metrodreaminKML = metrodreaminToKML(metrodreaminObj, { onlyLines, onlyStations });

			const xml = stringify(metrodreaminKML, { indentSize: 4 });

			const { title } = metrodreaminObj.props.pageProps.systemDocData;
			const timestamp = format(new Date(), "yyyyMMddHHmmss");
			return Deno.writeTextFile(`./${sanitize(title) || "untitled"}_${timestamp}_${i}.kml`, xml, {});
		});
	return Promise.all(promises);
}

function exitError(errorMessage: string): never {
	console.error(`\
${c.red("[ERROR]")} ${errorMessage}
${c.brightBlue("[INFO]")}
${c.brightBlue("[INFO]")} Usage: metrodreamin [OPTION]... [URL]...
${c.brightBlue("[INFO]")}
${c.brightBlue("[INFO]")} ${c.underline("Additional options:")}
${c.brightBlue("[INFO]")}     --only-lines: Only include lines in the KML.
${c.brightBlue("[INFO]")}     --only-stations: Only include stations in the KML.
`);
	Deno.exit(-1);
}

main();
