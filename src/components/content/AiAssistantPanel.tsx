import { useMemo, useState } from "react";
import type { AssistantPrompt } from "../../data/aiAssistant";

type AiAssistantPanelProps = {
  description: string;
  placeholder: string;
  prompts: AssistantPrompt[];
  title: string;
};

export function AiAssistantPanel({
  description,
  placeholder,
  prompts,
  title
}: AiAssistantPanelProps) {
  const [selectedPromptId, setSelectedPromptId] = useState(prompts[0]?.id ?? "");
  const selectedPrompt = useMemo(
    () => prompts.find((prompt) => prompt.id === selectedPromptId) ?? prompts[0],
    [prompts, selectedPromptId]
  );

  return (
    <section className="section section--tight" data-reveal>
      <div className="container">
        <div className="ai-assistant card">
          <div className="ai-assistant__intro">
            <span className="section-header__eyebrow">AI Assistant</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>

          <div className="ai-assistant__layout">
            <div className="ai-assistant__chat">
              <div className="ai-assistant__message ai-assistant__message--user">
                <span>You</span>
                <strong>{selectedPrompt?.label}</strong>
              </div>
              <div className="ai-assistant__message ai-assistant__message--assistant">
                <span>Assistant</span>
                <strong>{selectedPrompt?.response}</strong>
              </div>
              <div className="ai-assistant__composer" aria-label="Assistant input mock">
                <input aria-label="Ask the AI assistant" placeholder={placeholder} readOnly type="text" value="" />
                <button className="button button--secondary" type="button">
                  Ask
                </button>
              </div>
            </div>

            <div className="ai-assistant__suggestions">
              <span className="ai-assistant__label">Suggested questions</span>
              <div className="ai-assistant__suggestion-list">
                {prompts.map((prompt) => (
                  <button
                    className={`ai-assistant__suggestion ${prompt.id === selectedPrompt?.id ? "is-active" : ""}`}
                    key={prompt.id}
                    onClick={() => setSelectedPromptId(prompt.id)}
                    type="button"
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
