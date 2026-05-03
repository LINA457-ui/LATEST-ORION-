import fs from "node:fs";
import { Buffer } from "node:buffer";
import { OpenAI, toFile } from "openai";
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    throw new Error("OPENAI_API_KEY must be set.");
}
export const openai = new OpenAI({
    apiKey,
});
export async function generateImageBuffer(prompt, size = "1024x1024") {
    const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        size,
    });
    const base64 = response.data?.[0]?.b64_json ?? "";
    return Buffer.from(base64, "base64");
}
export async function editImages(imageFiles, prompt, outputPath) {
    const images = await Promise.all(imageFiles.map((file) => toFile(fs.createReadStream(file), file, {
        type: "image/png",
    })));
    const response = await openai.images.edit({
        model: "gpt-image-1",
        image: images,
        prompt,
    });
    const imageBase64 = response.data?.[0]?.b64_json ?? "";
    const imageBytes = Buffer.from(imageBase64, "base64");
    if (outputPath) {
        fs.writeFileSync(outputPath, imageBytes);
    }
    return imageBytes;
}
