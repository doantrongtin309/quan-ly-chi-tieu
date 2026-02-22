
import { GoogleGenAI, Type } from "@google/genai";
import { Category } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseSpendingInput = async (input: string): Promise<{
  amount: number;
  category: Category;
  description: string;
}> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Hãy phân tích câu sau đây để lấy thông tin chi tiêu: "${input}". 
    Các loại chi tiêu hợp lệ là: "${Category.FOOD}", "${Category.HANG_OUT}", "${Category.SHOPPING}", "${Category.OTHER}".
    
    QUY TẮC ĐẶC BIỆT:
    - Nếu nội dung có chứa từ "cafe" hoặc "ăn phố", bạn PHẢI xếp vào loại "${Category.HANG_OUT}".
    - Nếu không rõ, hãy xếp vào "${Category.OTHER}". 
    
    Hãy chuyển đơn vị tiền tệ sang số nguyên (ví dụ: 30k -> 30000).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          amount: {
            type: Type.NUMBER,
            description: "Số tiền chi tiêu (số nguyên).",
          },
          category: {
            type: Type.STRING,
            description: "Phân loại chi tiêu.",
          },
          description: {
            type: Type.STRING,
            description: "Mô tả ngắn gọn chi tiêu.",
          },
        },
        required: ["amount", "category", "description"],
      },
    },
  });

  try {
    const result = JSON.parse(response.text || "{}");
    let finalCategory = Object.values(Category).includes(result.category as Category) 
                ? (result.category as Category) 
                : Category.OTHER;

    // Hard rule override to ensure "cafe" or "ăn phố" always maps to HANG_OUT
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes("cafe") || lowerInput.includes("ăn phố")) {
      finalCategory = Category.HANG_OUT;
    }

    return {
      amount: result.amount || 0,
      category: finalCategory,
      description: result.description || input,
    };
  } catch (error) {
    console.error("Error parsing Gemini response:", error);
    throw new Error("Không thể hiểu được nội dung nhập vào.");
  }
};
