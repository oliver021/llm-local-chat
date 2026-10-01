import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatInput } from '../../../components/ChatInput';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { ProviderHint } from '../../../components/ModelSelector/shared/ProviderHint';
import { PreviewNotice } from '../../../components/settings/PreviewNotice';
import { UserAvatar } from '../../../components/UserAvatar';
import { makeActions, renderWithActions, renderWithSettings } from './helpers';

describe('ChatInput', () => {
  const box = () => screen.getByPlaceholderText('Message Aura…') as HTMLTextAreaElement;

  it('sends the trimmed text on Enter and clears the box', async () => {
    const { actions } = renderWithActions(<ChatInput />);
    await userEvent.type(box(), '  hello  {Enter}');
    expect(actions.handleSendMessage).toHaveBeenCalledWith('hello');
    expect(box().value).toBe('');
  });

  it('inserts a newline on Shift+Enter instead of sending', async () => {
    const { actions } = renderWithActions(<ChatInput />);
    await userEvent.type(box(), 'line one{Shift>}{Enter}{/Shift}line two');
    expect(actions.handleSendMessage).not.toHaveBeenCalled();
    expect(box().value).toBe('line one\nline two');
  });

  it('keeps Send disabled until there is text, and never sends blanks', async () => {
    const { actions } = renderWithActions(<ChatInput />);
    const send = screen.getByRole('button', { name: 'Send message' });
    expect(send).toBeDisabled();
    await userEvent.type(box(), '   {Enter}');
    expect(actions.handleSendMessage).not.toHaveBeenCalled();
    await userEvent.type(box(), 'x');
    expect(send).toBeEnabled();
    await userEvent.click(send);
    expect(actions.handleSendMessage).toHaveBeenCalledWith('x');
  });

  it('caps the message at 4000 characters', () => {
    renderWithActions(<ChatInput />);
    fireEvent.change(box(), { target: { value: 'a'.repeat(4500) } });
    expect(box().value).toHaveLength(4000);
    expect(screen.getByText('4000 / 4000')).toBeInTheDocument();
  });

  it('turns into a Stop button while a reply is streaming', async () => {
    const { actions } = renderWithActions(<ChatInput isStreaming />);
    expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Stop generating' }));
    expect(actions.handleStopStreaming).toHaveBeenCalledTimes(1);
  });

  it('exposes the textarea through a forwarded ref', () => {
    const ref = { current: null as HTMLTextAreaElement | null };
    renderWithActions(<ChatInput inputRef={ref} />, makeActions());
    expect(ref.current).toBe(box());
  });
});

describe('ErrorBoundary', () => {
  function Bomb({ explode }: { explode: boolean }) {
    if (explode) throw new Error('kaboom');
    return <p>all good</p>;
  }

  it('catches render errors, shows the message, and recovers on Try again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let explode = true;
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb explode={explode} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('kaboom')).toBeInTheDocument();

    explode = false;
    rerender(
      <ErrorBoundary>
        <Bomb explode={explode} />
      </ErrorBoundary>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('renders a custom fallback when given one', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<p>custom fallback</p>}>
        <Bomb explode />
      </ErrorBoundary>
    );
    expect(screen.getByText('custom fallback')).toBeInTheDocument();
  });
});

describe('ProviderHint', () => {
  it('points users at the server .env for cloud keys', () => {
    const { rerender } = render(<ProviderHint provider="llm-openai" status="no-key" />);
    expect(screen.getByText('Set OPENAI_API_KEY in .env and restart the server.')).toBeInTheDocument();
    rerender(<ProviderHint provider="llm-claude" status="no-key" />);
    expect(screen.getByText('Set ANTHROPIC_API_KEY in .env and restart the server.')).toBeInTheDocument();
  });

  it('explains how to reach local servers', () => {
    const { rerender } = render(<ProviderHint provider="llm-ollama" status="offline" />);
    expect(screen.getByText(/OLLAMA_URL/)).toBeInTheDocument();
    rerender(<ProviderHint provider="llm-llamacpp" status="offline" />);
    expect(screen.getByText(/LLAMA_SERVER_URL/)).toBeInTheDocument();
  });

  it('says nothing without a status or for combinations it has no text for', () => {
    const { container, rerender } = render(<ProviderHint provider="llm-openai" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ProviderHint provider="llm-openai" status="offline" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('UserAvatar', () => {
  it('shows initials from the display name', () => {
    renderWithSettings(<UserAvatar />, 'Ada Lovelace');
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('falls back to an icon without a name, and never loads an image', () => {
    const { container } = renderWithSettings(<UserAvatar />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('PreviewNotice', () => {
  it('is announced as a note', () => {
    render(<PreviewNotice />);
    expect(screen.getByRole('note')).toHaveTextContent(/not used yet/);
  });
});
