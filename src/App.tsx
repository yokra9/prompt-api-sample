import { useCallback, useRef, useState, type KeyboardEvent } from "react";

const App = () => {
  /**
   * テキストエリアの内容を保持するステート
   */
  const [prompt, setPrompt] = useState<string>("");

  /**
   * 会話履歴の配列
   */
  const [messages, setMessages] = useState<string[]>([]);

  /**
   * 現在の出力先となる吹出への参照
   */
  const currentBubbleRef = useRef<HTMLDivElement>(null);

  /**
   * LanguageModel オブジェクトの参照
   */
  const sessionRef = useRef<LanguageModel>(null);

  /**
   * 吹出の内容をクリアする関数
   */
  const clearBubble = useCallback(() => {
    if (currentBubbleRef.current === null) return;

    currentBubbleRef.current.textContent = "";
  }, []);

  /**
   * 吹出に文字列を追記する関数
   *
   * @param chunk 追記する文字列
   */
  const addChunk2Bubble = useCallback((chunk: string) => {
    if (currentBubbleRef.current === null) return;

    currentBubbleRef.current.textContent += chunk;
  }, []);

  /**
   * ReadableStreamDefaultReader の内容を読み取る関数
   *
   * @param reader 読み取る ReadableStreamDefaultReader
   */
  const readChunk = useCallback(
    async (reader: ReadableStreamDefaultReader<string>) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        addChunk2Bubble(value);
      }
    },
    [addChunk2Bubble],
  );

  /**
   * プロンプトを元に応答を生成する関数
   *
   * @param prompt
   */
  const generate = useCallback(
    async (prompt: string) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (LanguageModel === undefined) {
        console.error("Prompt API が利用できません。");
        return;
      }

      const availability = await LanguageModel.availability({
        expectedOutputs: [{ type: "text", languages: ["ja"] }],
      });

      switch (availability) {
        case "unavailable":
          console.error("言語モデルが利用できません。");
          break;

        case "downloadable":
        case "downloading":
          console.error(
            "言語モデルは利用できますが、まずダウンロードの必要があります",
            availability,
          );
          break;

        case "available": {
          // セションを開始する
          if (sessionRef.current === null)
            sessionRef.current = await LanguageModel.create({
              initialPrompts: [
                {
                  role: "system",
                  content:
                    "あなたは親切なアシスタントです。日本語で回答してください。",
                },
              ],
              expectedOutputs: [{ type: "text", languages: ["ja"] }],
            });

          // 言語モデルにプロンプトを与え、ストリームを取得する
          const stream = sessionRef.current.promptStreaming(prompt);

          // ストリームからチャンクを読み取る
          const reader = stream.getReader();
          await readChunk(reader);
          break;
        }

        default:
          availability satisfies never;
      }
    },
    [readChunk],
  );

  /**
   * テキストエリアでキーボードを押下したときのイベントハンドラ
   */
  const onkeydownHandler = useCallback(
    ({ ctrlKey, metaKey, code }: KeyboardEvent<HTMLTextAreaElement>) => {
      if ([ctrlKey, metaKey].includes(true) && code === "Enter") {
        if (currentBubbleRef.current?.textContent === undefined) {
          setMessages([...messages, prompt]);
        } else {
          setMessages([
            ...messages,
            currentBubbleRef.current.textContent,
            prompt,
          ]);
        }

        setPrompt("");
        clearBubble();
        void generate(prompt);
      }
    },
    [clearBubble, generate, messages, prompt],
  );

  return (
    <>
      <main className="grid grid-rows-[auto_1fr_80px] h-dvh">
        <div className="grid grid-cols-2 items-start gap-4 p-4">
          {messages.map((message) => (
            <div
              className="rounded-md shadow-md p-2 odd:bg-blue-200 even:bg-gray-200 odd:mb-10 even:mt-10 first:invisible"
              key={message}
            >
              {message}
            </div>
          ))}

          <div
            className="rounded-md shadow-md p-2 odd:bg-blue-200 even:bg-gray-200 odd:mb-10 even:mt-10 first:invisible"
            ref={currentBubbleRef}
          ></div>
        </div>

        <div />

        <div className="flex justify-center w-full">
          <textarea
            className="border-2 m-2 p-2 border-gray-500 rounded-md w-3/4"
            placeholder="プロンプトを入力。Ctrl + Enter で送信。"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
            }}
            onKeyDown={onkeydownHandler}
          />
        </div>
      </main>
    </>
  );
};

export default App;
