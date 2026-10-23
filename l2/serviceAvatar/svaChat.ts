/// <mls fileReference="_102020_/l2/serviceAvatar/svaChat.ts" enhancement="_blank"/>

// The conversation plumbing of the floating chat. It does what the messages panel does for an
// '@@agent' message (collabMessagesChat.addMessageIA), only from a different screen:
//   - the user: getUserId() (saved by collab-messages), else msgGetUserUpdate;
//   - one private thread named after the agent ("agentAssistant"), so the task is also open in the
//     messages panel for analysis. It must exist in the LOCAL cache (IndexedDB) too: the
//     orchestration updates the thread's pending tasks there and throws "Thread not found" otherwise;
//   - send: getTemporaryContext + environment.agents.executeAgent('agentAssistant', context);
//   - follow: the orchestration fires 'task-change' after every applied batch. The batch that
//     creates the task carries oldContextCreateAt = the createAt of OUR temporary context, which is
//     how the chat learns which task answers which message;
//   - the message the backend created for the task is written to IndexedDB, which the messages
//     panel does when the thread is open in it. getClarificationElement reads it from there
//     (getAgentContext: "Message not found" otherwise).

import { environment } from '/_102036_/l2/environmentContract.js';
import { msgAddThread, msgGetUserUpdate } from '/_102036_/l2/shared/api.js';
import { addMessage, addThread, getThreadByName } from '/_102036_/l2/collabMessagesIndexedDB.js';
import { getUserId } from '/_102025_/l2/collabMessagesHelper.js';
import { getTemporaryContext, notifyThreadCreate } from '/_102027_/l2/aiAgentHelper.js';
import { getClarificationElement } from '/_102027_/l2/aiAgentOrchestration.js';
import { taskView, type SvaView } from '/_102020_/l2/serviceAvatar/svaView.js';

export const SVA_AGENT = 'agentAssistant';
// the room of the conversation is named after the agent it talks to
export const SVA_THREAD_NAME = SVA_AGENT;

export interface SvaChatEvents {
  onView(view: SvaView, task: mls.msg.TaskData): void;
  onClarification(element: HTMLElement, stepId: number): void;
  onError(message: string): void;
}

interface TaskChangeDetail {
  context?: mls.msg.ExecutionContext;
  oldContextCreateAt?: string;
}

export class SvaChat {
  private userId = '';
  private threadId = '';
  private pendingCreateAt = '';
  private taskId = '';
  private mountedClarification = 0;
  private storedMessages = new Set<string>();
  private readonly onTaskChange = (event: Event): void => {
    void this.handleTaskChange((event as CustomEvent<TaskChangeDetail>).detail);
  };

  constructor(private readonly events: SvaChatEvents) {
    scopeWindow()?.addEventListener('task-change', this.onTaskChange);
  }

  dispose(): void {
    scopeWindow()?.removeEventListener('task-change', this.onTaskChange);
  }

  get busy(): boolean {
    return !!this.pendingCreateAt || !!this.taskId;
  }

  // Agents load from mls.stor.files, filled by the studio bootstrap.
  static ready(): boolean {
    const files = (globalThis as unknown as { mls?: { stor?: { files?: Record<string, unknown> } } }).mls?.stor?.files;
    return !!files && Object.keys(files).length > 0;
  }

  async send(text: string): Promise<void> {
    const userId = await this.ensureUser();
    const threadId = await this.ensureThread(userId);
    const context = getTemporaryContext(threadId, userId, `@@${SVA_AGENT} ${text}`);
    this.pendingCreateAt = context.message.createAt;
    this.taskId = '';
    this.mountedClarification = 0;
    try {
      // fire and forget, like the messages panel: progress arrives through 'task-change'
      await environment.agents.executeAgent(SVA_AGENT, context as never);
    } catch (error) {
      this.reset();
      throw error;
    }
  }

  reset(): void {
    this.pendingCreateAt = '';
    this.taskId = '';
    this.mountedClarification = 0;
  }

  private async handleTaskChange(detail: TaskChangeDetail | undefined): Promise<void> {
    const task = detail?.context?.task;
    const message = detail?.context?.message;
    if (!task || !message) return;
    if (!this.taskId) {
      // the batch that created the task answers OUR message
      if (!this.pendingCreateAt || detail?.oldContextCreateAt !== this.pendingCreateAt) return;
      this.taskId = task.PK;
      this.pendingCreateAt = '';
    }
    if (task.PK !== this.taskId) return;
    await this.storeMessage(message);

    const view = taskView(task);
    this.events.onView(view, task);
    if (view.kind === 'waiting' && view.stepId !== this.mountedClarification) {
      this.mountedClarification = view.stepId;
      try {
        const element = await getClarificationElement({ message, task, isTest: false });
        this.events.onClarification(element, view.stepId);
      } catch (error) {
        this.mountedClarification = 0;
        this.events.onError(error instanceof Error ? error.message : String(error));
      }
    }
    if (view.kind === 'done' || view.kind === 'failed') this.reset();
  }

  private async ensureUser(): Promise<string> {
    if (this.userId) return this.userId;
    let userId = safe(() => getUserId()) || '';
    if (!userId) {
      const result = await msgGetUserUpdate({ userId: '', name: environment.config.getDefaultUserName() });
      userId = result.success && result.response?.user ? result.response.user.userId : '';
    }
    if (!userId) throw new Error('[serviceAvatar] no collab user in this session');
    this.userId = userId;
    return userId;
  }

  private async ensureThread(userId: string): Promise<string> {
    if (this.threadId) return this.threadId;
    const cached = await getThreadByName(SVA_THREAD_NAME).catch(() => undefined);
    if (cached?.threadId) {
      this.threadId = cached.threadId;
      return cached.threadId;
    }
    const result = await msgAddThread({
      userId,
      name: SVA_THREAD_NAME,
      group: 'CONNECT',
      visibility: 'private',
      status: 'active',
      languages: [],
      avatar_url: '',
    });
    const thread = result.success ? result.response?.thread : undefined;
    if (!thread?.threadId) throw new Error(`[serviceAvatar] could not create the ${SVA_THREAD_NAME} thread: ${result.error || ''}`);
    // same as the panel's createThread: local cache first, then the thread list learns about it
    const cachedThread = await addThread(thread);
    notifyThreadCreate(cachedThread as unknown as mls.msg.Thread);
    this.threadId = thread.threadId;
    return thread.threadId;
  }

  private async storeMessage(message: mls.msg.Message): Promise<void> {
    const key = `${message.threadId}/${message.createAt}`;
    if (!message.orderAt || this.storedMessages.has(key)) return;
    try {
      await addMessage({ ...message, footers: [] } as never);
      this.storedMessages.add(key);
    } catch (error) {
      console.warn(`[serviceAvatar] message not cached: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

function scopeWindow(): Window | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.top || window;
}

function safe<T>(read: () => T): T | null {
  try {
    return read();
  } catch {
    return null;
  }
}
