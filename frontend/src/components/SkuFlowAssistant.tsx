import React from 'react';
import { Link } from 'react-router-dom';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
};

type Props = {
  inApp: boolean;
};

const quickPrompts = [
  'Which plan is right for me?',
  'How do I connect integrations?',
  'Show me forecasting features',
  'How do I request a demo?'
];

function getAssistantReply(input: string, inApp: boolean): { text: string; link?: string; linkLabel?: string } {
  const normalized = input.toLowerCase();

  if (normalized.includes('plan') || normalized.includes('pricing')) {
    return {
      text: 'Starter fits lean teams, Pro adds advanced automation and integrations, and Enterprise is best for complex org controls.',
      link: '/pricing',
      linkLabel: 'Go to Pricing'
    };
  }

  if (normalized.includes('integrat') || normalized.includes('connect')) {
    return inApp
      ? {
          text: 'Open Integrations in your app to connect POS/ERP/WMS and monitor sync status.',
          link: '/app/integrations',
          linkLabel: 'Open Integrations'
        }
      : {
          text: 'SkuFlow connects with POS, ERP, WMS, and eCommerce systems through connectors and API routes.',
          link: '/features/integrations',
          linkLabel: 'View Integrations Feature'
        };
  }

  if (normalized.includes('forecast')) {
    return inApp
      ? { text: 'Use Dashboard and Reports to review forecast accuracy, risk distribution, and top moving SKUs.' }
      : { text: 'SkuFlow forecasting combines model selection, confidence scoring, and exception management.' , link: '/solutions/forecasting', linkLabel: 'View Forecasting Solution' };
  }

  if (normalized.includes('demo') || normalized.includes('contact')) {
    return { text: 'I can help you schedule a tailored walkthrough for your workflow and data stack.', link: '/company/contact', linkLabel: 'Request Demo' };
  }

  if (normalized.includes('support') || normalized.includes('help')) {
    return { text: 'If you need human help, use Contact Support and include your org name and issue details for faster routing.', link: '/company/contact', linkLabel: 'Contact Support' };
  }

  return {
    text: "I’m not fully sure based on that wording yet. I can route you to docs, pricing, or support.",
    link: '/resources/faq',
    linkLabel: 'Open FAQ'
  };
}

export default function SkuFlowAssistant({ inApp }: Props) {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: inApp
        ? 'Ask SkuFlow for help with workflows, integrations, plans, or next actions.'
        : 'Ask SkuFlow about pricing, features, onboarding, or getting a demo.'
    }
  ]);

  function send(text: string) {
    if (!text.trim()) return;
    const userMessage: Message = { id: `u-${Date.now()}`, role: 'user', text };
    const reply = getAssistantReply(text, inApp);
    const assistantMessage: Message = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: reply.text
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setInput('');
  }

  return (
    <div className="fixed bottom-4 right-4 z-[70]">
      {open ? (
        <div className="w-[340px] rounded-2xl border border-slate-700 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Ask SkuFlow</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-slate-700 px-2 py-1 text-xs hover:bg-slate-900"
            >
              Close
            </button>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto px-4 py-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-lg px-3 py-2 text-sm ${message.role === 'assistant' ? 'bg-slate-900 text-slate-200' : 'bg-blue-600/20 text-blue-100'}`}
              >
                {message.text}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 px-4 py-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-900"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about pricing, setup, or workflows..."
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
              <button
                type="button"
                onClick={() => send(input)}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Send
              </button>
            </div>

            <div className="mt-2 flex gap-2 text-xs">
              <Link to="/company/contact" className="text-blue-300 hover:text-blue-200">
                Request Demo
              </Link>
              <span className="text-slate-500">•</span>
              <Link to={inApp ? '/app/integrations' : '/resources/faq'} className="text-blue-300 hover:text-blue-200">
                {inApp ? 'In-app help' : 'FAQ'}
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-blue-500 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-blue-500"
        >
          Ask SkuFlow
        </button>
      ) : null}
    </div>
  );
}
