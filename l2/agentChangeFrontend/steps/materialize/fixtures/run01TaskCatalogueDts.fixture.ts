/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/materialize/fixtures/run01TaskCatalogueDts.fixture.ts" enhancement="_blank"/>

/**
 * The run01 (102047, 28/ago) pair that shipped a module which does not compile, copied VERBATIM.
 *
 * `RUN01_TASK_CATALOGUE_DTS` is `web/shared/taskCatalogueDts.txt` as the run left it — it declares
 * `handleQryListTaskClick(): void` and gives every `handle…Click` a NO-ARGUMENT signature.
 * `RUN01_TASK_CATALOGUE_SHARED` is `web/shared/taskCatalogue.ts` as the run left it — the handler is GONE
 * and the survivors take `(_event: Event)`. The three pages were generated against the artifact, were
 * faithful to it, and produced the five tsc errors (TS2551 + TS2554) the module still carries.
 *
 * Copied, not read from mls-102047: that project is disposable and a test of a permanent project must not
 * depend on it (a deleted fixture would go GREEN, which is the dangerous direction).
 */
export const RUN01_TASK_CATALOGUE_DTS = `import { CollabLitElement } from '/_102029_/l2/collabLitElement.js';
import type { QryListTaskOutput, CmdCreateTaskOutput, CmdUpdateTaskOutput, CmdDeleteTaskOutput, QryGetTaskOutput } from '/_102047_/l2/todo/web/contracts/taskCatalogue.js';
export type { QryListTaskInput, QryListTaskOutput, CmdCreateTaskInput, CmdCreateTaskOutput, CmdUpdateTaskInput, CmdUpdateTaskOutput, CmdDeleteTaskInput, CmdDeleteTaskOutput, QryGetTaskInput, QryGetTaskOutput } from '/_102047_/l2/todo/web/contracts/taskCatalogue.js';
type ActionStatus = 'idle' | 'loading' | 'success' | 'error';
type CreateStatus = 'pending' | 'inProgress' | 'completed' | 'cancelled' | '';
type Priority = 'low' | 'medium' | 'high' | '';
type SortBy = 'status' | 'priority' | 'dueDate' | 'createdAt' | 'updatedAt' | '';
type SortOrder = 'asc' | 'desc' | '';
export declare class TodoTaskCatalogueBase extends CollabLitElement {
    /** state status — pageStatus */
    status: string;
    /** state ui.taskCatalogue.action.qryListTask.status — actionStatus, values: idle|loading|success|error */
    qryListTaskState: ActionStatus;
    /** state ui.taskCatalogue.input.qryListTask.search — input */
    qryListTaskSearch: string;
    /** state ui.taskCatalogue.input.qryListTask.sortBy — input, values: status|priority|dueDate|createdAt|updatedAt */
    qryListTaskSortBy: SortBy;
    /** state ui.taskCatalogue.input.qryListTask.sortOrder — input, values: asc|desc */
    qryListTaskSortOrder: SortOrder;
    /** state ui.taskCatalogue.data.qryListTask — queryResult, outputShape: array */
    qryListTaskData: QryListTaskOutput[];
    /** state ui.taskCatalogue.action.cmdCreateTask.status — actionStatus, values: idle|loading|success|error */
    cmdCreateTaskState: ActionStatus;
    /** state ui.taskCatalogue.input.cmdCreateTask.title — input */
    cmdCreateTaskTitle: string;
    /** state ui.taskCatalogue.input.cmdCreateTask.description — input */
    cmdCreateTaskDescription: string;
    /** state ui.taskCatalogue.input.cmdCreateTask.status — input, values: pending|inProgress|completed|cancelled */
    cmdCreateTaskStatus: CreateStatus;
    /** state ui.taskCatalogue.input.cmdCreateTask.priority — input, values: low|medium|high */
    cmdCreateTaskPriority: Priority;
    /** state ui.taskCatalogue.input.cmdCreateTask.dueDate — input */
    cmdCreateTaskDueDate: string;
    /** state ui.taskCatalogue.input.cmdCreateTask.createdAt — input */
    cmdCreateTaskCreatedAt: string;
    /** state ui.taskCatalogue.input.cmdCreateTask.updatedAt — input */
    cmdCreateTaskUpdatedAt: string;
    /** state ui.taskCatalogue.output.cmdCreateTask — commandOutput, outputShape: object */
    cmdCreateTaskOutput: CmdCreateTaskOutput | null;
    /** state ui.taskCatalogue.action.cmdCreateTask.error — actionError */
    cmdCreateTaskError: string;
    /** state ui.taskCatalogue.action.cmdUpdateTask.status — actionStatus, values: idle|loading|success|error */
    cmdUpdateTaskState: ActionStatus;
    /** state ui.taskCatalogue.input.cmdUpdateTask.taskId — input */
    cmdUpdateTaskTaskId: string;
    /** state ui.taskCatalogue.input.cmdUpdateTask.title — input */
    cmdUpdateTaskTitle: string;
    /** state ui.taskCatalogue.input.cmdUpdateTask.description — input */
    cmdUpdateTaskDescription: string;
    /** state ui.taskCatalogue.input.cmdUpdateTask.status — input, values: pending|inProgress|completed|cancelled */
    cmdUpdateTaskStatus: CreateStatus;
    /** state ui.taskCatalogue.input.cmdUpdateTask.priority — input, values: low|medium|high */
    cmdUpdateTaskPriority: Priority;
    /** state ui.taskCatalogue.input.cmdUpdateTask.dueDate — input */
    cmdUpdateTaskDueDate: string;
    /** state ui.taskCatalogue.input.cmdUpdateTask.createdAt — input */
    cmdUpdateTaskCreatedAt: string;
    /** state ui.taskCatalogue.input.cmdUpdateTask.updatedAt — input */
    cmdUpdateTaskUpdatedAt: string;
    /** state ui.taskCatalogue.output.cmdUpdateTask — commandOutput, outputShape: object */
    cmdUpdateTaskOutput: CmdUpdateTaskOutput | null;
    /** state ui.taskCatalogue.action.cmdUpdateTask.error — actionError */
    cmdUpdateTaskError: string;
    /** state ui.taskCatalogue.action.cmdDeleteTask.status — actionStatus, values: idle|loading|success|error */
    cmdDeleteTaskState: ActionStatus;
    /** state ui.taskCatalogue.input.cmdDeleteTask.taskId — input */
    cmdDeleteTaskTaskId: string;
    /** state ui.taskCatalogue.output.cmdDeleteTask — commandOutput, outputShape: object */
    cmdDeleteTaskOutput: CmdDeleteTaskOutput | null;
    /** state ui.taskCatalogue.action.cmdDeleteTask.error — actionError */
    cmdDeleteTaskError: string;
    /** state ui.taskCatalogue.action.qryGetTask.status — actionStatus, values: idle|loading|success|error */
    qryGetTaskState: ActionStatus;
    /** state ui.taskCatalogue.input.qryGetTask.taskId — input */
    qryGetTaskTaskId: string;
    /** state ui.taskCatalogue.data.qryGetTask — queryResult, outputShape: object */
    qryGetTaskData: QryGetTaskOutput | null;
    private readonly stateKeys;
    connectedCallback(): void;
    disconnectedCallback(): void;
    handleIcaStateChange(key: string, value: unknown): void;
    private readonly fieldMap;
    private loadStateValues;
    private setMapped;
    /** action qryListTask (query) — route todo.taskCatalogue.qryListTask; inputs: search, sortBy, sortOrder; writes ui.taskCatalogue.data.qryListTask; status ui.taskCatalogue.action.qryListTask.status */
    loadQryListTask(): Promise<void>;
    /** action qryGetTask (query) — route todo.taskCatalogue.qryGetTask; inputs: taskId; writes ui.taskCatalogue.data.qryGetTask; status ui.taskCatalogue.action.qryGetTask.status */
    loadQryGetTask(): Promise<void>;
    private executeCreate;
    /** action cmdCreateTask (command) — route todo.taskCatalogue.cmdCreateTask; inputs: title, description, status, priority, dueDate, createdAt, updatedAt; writes ui.taskCatalogue.output.cmdCreateTask; status ui.taskCatalogue.action.cmdCreateTask.status; feedback keys action.cmdCreateTask.success / action.cmdCreateTask.error */
    cmdCreateTask(): Promise<void>;
    /** handler for action cmdCreateTask — bind UI events here */
    handleCmdCreateTaskClick(): void;
    private executeUpdate;
    /** action cmdUpdateTask (command) — route todo.taskCatalogue.cmdUpdateTask; inputs: taskId, title, description, status, priority, dueDate, createdAt, updatedAt; writes ui.taskCatalogue.output.cmdUpdateTask; status ui.taskCatalogue.action.cmdUpdateTask.status; feedback keys action.cmdUpdateTask.success / action.cmdUpdateTask.error */
    cmdUpdateTask(): Promise<void>;
    /** handler for action cmdUpdateTask — bind UI events here */
    handleCmdUpdateTaskClick(): void;
    private executeDelete;
    /** action cmdDeleteTask (command) — route todo.taskCatalogue.cmdDeleteTask; inputs: taskId; writes ui.taskCatalogue.output.cmdDeleteTask; status ui.taskCatalogue.action.cmdDeleteTask.status; feedback keys action.cmdDeleteTask.success / action.cmdDeleteTask.error */
    cmdDeleteTask(): Promise<void>;
    /** handler for action cmdDeleteTask — bind UI events here */
    handleCmdDeleteTaskClick(): void;
    /** handler for action qryListTask — bind UI events here */
    handleQryListTaskClick(): void;
    /** handler for action qryGetTask — bind UI events here */
    handleQryGetTaskClick(): void;
    private change;
    /** setter for state ui.taskCatalogue.input.qryListTask.search */
    setQryListTaskSearch(value: string): void;
    /** handler for action set.qryListTaskSearch — bind UI events here */
    handleQryListTaskSearchChange(event: Event): void;
    /** setter for state ui.taskCatalogue.input.qryListTask.sortBy */
    setQryListTaskSortBy(value: SortBy): void;
    /** handler for action set.qryListTaskSortBy — bind UI events here */
    handleQryListTaskSortByChange(event: Event): void;
    /** setter for state ui.taskCatalogue.input.qryListTask.sortOrder */
    setQryListTaskSortOrder(value: SortOrder): void;
    /** handler for action set.qryListTaskSortOrder — bind UI events here */
    handleQryListTaskSortOrderChange(event: Event): void;
    private setString;
    /** setter for state ui.taskCatalogue.input.cmdCreateTask.title */ setCmdCreateTaskTitle(value: string): void;
    /** handler for action set.cmdCreateTaskTitle — bind UI events here */ handleCmdCreateTaskTitleChange(event: Event): void;
    /** setter for state ui.taskCatalogue.input.cmdCreateTask.description */ setCmdCreateTaskDescription(value: string): void;
    /** handler for action set.cmdCreateTaskDescription — bind UI events here */ handleCmdCreateTaskDescriptionChange(event: Event): void;
    /** setter for state ui.taskCatalogue.input.cmdCreateTask.status */ setCmdCreateTaskStatus(value: CreateStatus): void;
    /** handler for action set.cmdCreateTaskStatus — bind UI events here */ handleCmdCreateTaskStatusChange(event: Event): void;
    /** setter for state ui.taskCatalogue.input.cmdCreateTask.priority */ setCmdCreateTaskPriority(value: Priority): void;
    /** handler for action set.cmdCreateTaskPriority — bind UI events here */ handleCmdCreateTaskPriorityChange(event: Event): void;
    /** setter for state ui.taskCatalogue.input.cmdCreateTask.dueDate */ setCmdCreateTaskDueDate(value: string): void;
    /** handler for action set.cmdCreateTaskDueDate — bind UI events here */ handleCmdCreateTaskDueDateChange(event: Event): void;
    /** setter for state ui.taskCatalogue.input.cmdCreateTask.createdAt */ setCmdCreateTaskCreatedAt(value: string): void;
    /** handler for action set.cmdCreateTaskCreatedAt — bind UI events here */ handleCmdCreateTaskCreatedAtChange(event: Event): void;
    /** setter for state ui.taskCatalogue.input.cmdCreateTask.updatedAt */ setCmdCreateTaskUpdatedAt(value: string): void;
    /** handler for action set.cmdCreateTaskUpdatedAt — bind UI events here */ handleCmdCreateTaskUpdatedAtChange(event: Event): void;
    /** setter for state ui.taskCatalogue.input.cmdUpdateTask.taskId */ setCmdUpdateTaskTaskId(value: string): void;
    /** handler for action set.cmdUpdateTaskTaskId — bind UI events here */ handleCmdUpdateTaskTaskIdChange(event: Event): void;
    /** setter for state ui.taskCatalogue.input.cmdUpdateTask.title */ setCmdUpdateTaskTitle(value: string): void;
    /** handler for action set.cmdUpdateTaskTitle — bind UI events here */ handleCmdUpdateTaskTitleChange(event: Event): void;
    /** setter for state ui.taskCatalogue.input.cmdUpdateTask.description */ setCmdUpdateTaskDescription(value: string): void;
    /** handler for action set.cmdUpdateTaskDescription — bind UI events here */ handleCmdUpdateTaskDescriptionChange(event: Event): void;
    /** setter for state ui.taskCatalogue.input.cmdUpdateTask.status */ setCmdUpdateTaskStatus(value: CreateStatus): void;
    /** handler for action set.cmdUpdateTaskStatus — bind UI events here */ handleCmdUpdateTaskStatusChange(event: Event): void;
    /** setter for state ui.taskCatalogue.input.cmdUpdateTask.priority */ setCmdUpdateTaskPriority(value: Priority): void;
    /** handler for action set.cmdUpdateTaskPriority — bind UI events here */ handleCmdUpdateTaskPriorityChange(event: Event): void;
    /** setter for state ui.taskCatalogue.input.cmdUpdateTask.dueDate */ setCmdUpdateTaskDueDate(value: string): void;
    /** handler for action set.cmdUpdateTaskDueDate — bind UI events here */ handleCmdUpdateTaskDueDateChange(event: Event): void;
    /** setter for state ui.taskCatalogue.input.cmdUpdateTask.createdAt */ setCmdUpdateTaskCreatedAt(value: string): void;
    /** handler for action set.cmdUpdateTaskCreatedAt — bind UI events here */ handleCmdUpdateTaskCreatedAtChange(event: Event): void;
    /** setter for state ui.taskCatalogue.input.cmdUpdateTask.updatedAt */ setCmdUpdateTaskUpdatedAt(value: string): void;
    /** handler for action set.cmdUpdateTaskUpdatedAt — bind UI events here */ handleCmdUpdateTaskUpdatedAtChange(event: Event): void;
    /** setter for state ui.taskCatalogue.input.cmdDeleteTask.taskId */ setCmdDeleteTaskTaskId(value: string): void;
    /** handler for action set.cmdDeleteTaskTaskId — bind UI events here */ handleCmdDeleteTaskTaskIdChange(event: Event): void;
    /** setter for state ui.taskCatalogue.input.qryGetTask.taskId */ setQryGetTaskTaskId(value: string): void;
    /** handler for action set.qryGetTaskTaskId — bind UI events here */ handleQryGetTaskTaskIdChange(event: Event): void;
}
`;

export const RUN01_TASK_CATALOGUE_SHARED = `/// <mls fileReference="_102047_/l2/todo/web/shared/taskCatalogue.ts" enhancement="_102020_/l2/enhancementAura"/>

import { CollabLitElement } from '/_102029_/l2/collabLitElement.js';
import { property } from 'lit/decorators.js';
import { execBff, type BffClientOptions } from '/_102029_/l2/bffClient.js';
import { runBlockingUiAction } from '/_102029_/l2/interactionRuntime.js';
import { getState, setState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import type {
  QryListTaskInput,
  QryListTaskOutput,
  CmdCreateTaskInput,
  CmdCreateTaskOutput,
  CmdUpdateTaskInput,
  CmdUpdateTaskOutput,
  CmdDeleteTaskInput,
  CmdDeleteTaskOutput,
  QryGetTaskInput,
  QryGetTaskOutput
}
  from '/_102047_/l2/todo/web/contracts/taskCatalogue.js';
import {
  qryListTaskRoute,
  cmdCreateTaskRoute,
  cmdUpdateTaskRoute,
  cmdDeleteTaskRoute,
  qryGetTaskRoute
}
  from '/_102047_/l2/todo/web/contracts/taskCatalogue.js';
export type {
  QryListTaskInput,
  QryListTaskOutput,
  CmdCreateTaskInput,
  CmdCreateTaskOutput,
  CmdUpdateTaskInput,
  CmdUpdateTaskOutput,
  CmdDeleteTaskInput,
  CmdDeleteTaskOutput,
  QryGetTaskInput,
  QryGetTaskOutput
}
  from '/_102047_/l2/todo/web/contracts/taskCatalogue.js';

type ActionStatus = 'idle' | 'loading' | 'success' | 'error';
type TaskStatus = 'pending' | 'inProgress' | 'completed' | 'cancelled' | '';
type TaskPriority = 'low' | 'medium' | 'high' | '';

export class TodoTaskCatalogueBase extends CollabLitElement {
  /** state ui.taskCatalogue.status — pageStatus */
  @property() status: string = '';
  /** state ui.taskCatalogue.action.qryListTask.status — actionStatus, values: idle|loading|success|error */
  @property() qryListTaskState: ActionStatus = 'idle';
  /** state ui.taskCatalogue.input.qryListTask.search — input */
  @property() qryListTaskSearch: string = '';
  /** state ui.taskCatalogue.input.qryListTask.sortBy — input, values: status|priority|dueDate|createdAt|updatedAt */
  @property() qryListTaskSortBy: QryListTaskInput['sortBy'] | '' = '';
  /** state ui.taskCatalogue.input.qryListTask.sortOrder — input, values: asc|desc */
  @property() qryListTaskSortOrder: QryListTaskInput['sortOrder'] | '' = '';
  /** state ui.taskCatalogue.data.qryListTask — queryResult, outputShape: array */
  @property() qryListTaskData: QryListTaskOutput[] = [];
  /** state ui.taskCatalogue.action.cmdCreateTask.status — actionStatus, values: idle|loading|success|error */
  @property() cmdCreateTaskState: ActionStatus = 'idle';
  /** state ui.taskCatalogue.input.cmdCreateTask.title — input */
  @property() cmdCreateTaskTitle: string = '';
  /** state ui.taskCatalogue.input.cmdCreateTask.description — input */
  @property() cmdCreateTaskDescription: string = '';
  /** state ui.taskCatalogue.input.cmdCreateTask.status — input, values: pending|inProgress|completed|cancelled */
  @property() cmdCreateTaskStatus: TaskStatus = '';
  /** state ui.taskCatalogue.input.cmdCreateTask.priority — input, values: low|medium|high */
  @property() cmdCreateTaskPriority: TaskPriority = '';
  /** state ui.taskCatalogue.input.cmdCreateTask.dueDate — input */
  @property() cmdCreateTaskDueDate: string = '';
  /** state ui.taskCatalogue.input.cmdCreateTask.createdAt — input */
  @property() cmdCreateTaskCreatedAt: string = '';
  /** state ui.taskCatalogue.input.cmdCreateTask.updatedAt — input */
  @property() cmdCreateTaskUpdatedAt: string = '';
  /** state ui.taskCatalogue.output.cmdCreateTask — commandOutput */
  @property() cmdCreateTaskOutput: CmdCreateTaskOutput | null = null;
  /** state ui.taskCatalogue.action.cmdCreateTask.error — actionError */
  @property() cmdCreateTaskError: string = '';
  /** state ui.taskCatalogue.action.cmdUpdateTask.status — actionStatus, values: idle|loading|success|error */
  @property() cmdUpdateTaskState: ActionStatus = 'idle';
  /** state ui.taskCatalogue.input.cmdUpdateTask.taskId — input */
  @property() cmdUpdateTaskTaskId: string = '';
  /** state ui.taskCatalogue.input.cmdUpdateTask.title — input */
  @property() cmdUpdateTaskTitle: string = '';
  /** state ui.taskCatalogue.input.cmdUpdateTask.description — input */
  @property() cmdUpdateTaskDescription: string = '';
  /** state ui.taskCatalogue.input.cmdUpdateTask.status — input, values: pending|inProgress|completed|cancelled */
  @property() cmdUpdateTaskStatus: TaskStatus = '';
  /** state ui.taskCatalogue.input.cmdUpdateTask.priority — input, values: low|medium|high */
  @property() cmdUpdateTaskPriority: TaskPriority = '';
  /** state ui.taskCatalogue.input.cmdUpdateTask.dueDate — input */
  @property() cmdUpdateTaskDueDate: string = '';
  /** state ui.taskCatalogue.input.cmdUpdateTask.createdAt — input */
  @property() cmdUpdateTaskCreatedAt: string = '';
  /** state ui.taskCatalogue.input.cmdUpdateTask.updatedAt — input */
  @property() cmdUpdateTaskUpdatedAt: string = '';
  /** state ui.taskCatalogue.output.cmdUpdateTask — commandOutput */
  @property() cmdUpdateTaskOutput: CmdUpdateTaskOutput | null = null;
  /** state ui.taskCatalogue.action.cmdUpdateTask.error — actionError */
  @property() cmdUpdateTaskError: string = '';
  /** state ui.taskCatalogue.action.cmdDeleteTask.status — actionStatus, values: idle|loading|success|error */
  @property() cmdDeleteTaskState: ActionStatus = 'idle';
  /** state ui.taskCatalogue.input.cmdDeleteTask.taskId — input */
  @property() cmdDeleteTaskTaskId: string = '';
  /** state ui.taskCatalogue.output.cmdDeleteTask — commandOutput */
  @property() cmdDeleteTaskOutput: CmdDeleteTaskOutput | null = null;
  /** state ui.taskCatalogue.action.cmdDeleteTask.error — actionError */
  @property() cmdDeleteTaskError: string = '';
  /** state ui.taskCatalogue.action.qryGetTask.status — actionStatus, values: idle|loading|success|error */
  @property() qryGetTaskState: ActionStatus = 'idle';
  /** state ui.taskCatalogue.input.qryGetTask.taskId — input */
  @property() qryGetTaskTaskId: string = '';
  /** state ui.taskCatalogue.data.qryGetTask — queryResult, outputShape: object */
  @property() qryGetTaskData: QryGetTaskOutput | null = null;

  private readonly stateKeys: string[] = [
    'ui.taskCatalogue.status', 'ui.taskCatalogue.action.qryListTask.status', 'ui.taskCatalogue.input.qryListTask.search',
    'ui.taskCatalogue.input.qryListTask.sortBy', 'ui.taskCatalogue.input.qryListTask.sortOrder', 'ui.taskCatalogue.data.qryListTask',
    'ui.taskCatalogue.action.cmdCreateTask.status', 'ui.taskCatalogue.input.cmdCreateTask.title', 'ui.taskCatalogue.input.cmdCreateTask.description',
    'ui.taskCatalogue.input.cmdCreateTask.status', 'ui.taskCatalogue.input.cmdCreateTask.priority', 'ui.taskCatalogue.input.cmdCreateTask.dueDate',
    'ui.taskCatalogue.input.cmdCreateTask.createdAt', 'ui.taskCatalogue.input.cmdCreateTask.updatedAt', 'ui.taskCatalogue.output.cmdCreateTask',
    'ui.taskCatalogue.action.cmdCreateTask.error', 'ui.taskCatalogue.action.cmdUpdateTask.status', 'ui.taskCatalogue.input.cmdUpdateTask.taskId',
    'ui.taskCatalogue.input.cmdUpdateTask.title', 'ui.taskCatalogue.input.cmdUpdateTask.description', 'ui.taskCatalogue.input.cmdUpdateTask.status',
    'ui.taskCatalogue.input.cmdUpdateTask.priority', 'ui.taskCatalogue.input.cmdUpdateTask.dueDate', 'ui.taskCatalogue.input.cmdUpdateTask.createdAt',
    'ui.taskCatalogue.input.cmdUpdateTask.updatedAt', 'ui.taskCatalogue.output.cmdUpdateTask', 'ui.taskCatalogue.action.cmdUpdateTask.error',
    'ui.taskCatalogue.action.cmdDeleteTask.status', 'ui.taskCatalogue.input.cmdDeleteTask.taskId', 'ui.taskCatalogue.output.cmdDeleteTask',
    'ui.taskCatalogue.action.cmdDeleteTask.error', 'ui.taskCatalogue.action.qryGetTask.status', 'ui.taskCatalogue.input.qryGetTask.taskId',
    'ui.taskCatalogue.data.qryGetTask'
  ];
  private subscribed = false;

  /** state delivery callback — updates the mapped reactive property */
  handleIcaStateChange(key: string, value: unknown): void {
    const fields: Record<string, (value: unknown) => void> = {
      'ui.taskCatalogue.status': (v: unknown) => {
        this.status = String(v ?? '');
      },
      'ui.taskCatalogue.action.qryListTask.status': (v: unknown) => {
        this.qryListTaskState = v as ActionStatus;
      },
      'ui.taskCatalogue.input.qryListTask.search': (v: unknown) => {
        this.qryListTaskSearch = String(v ?? '');
      },
      'ui.taskCatalogue.input.qryListTask.sortBy': (v: unknown) => {
        this.qryListTaskSortBy = v as QryListTaskInput['sortBy'] | '';
      },
      'ui.taskCatalogue.input.qryListTask.sortOrder': (v: unknown) => {
        this.qryListTaskSortOrder = v as QryListTaskInput['sortOrder'] | '';
      },
      'ui.taskCatalogue.data.qryListTask': (v: unknown) => {
        this.qryListTaskData = (v as QryListTaskOutput[] | null) ?? [];
      },
      'ui.taskCatalogue.action.cmdCreateTask.status': (v: unknown) => {
        this.cmdCreateTaskState = v as ActionStatus;
      },
      'ui.taskCatalogue.input.cmdCreateTask.title': (v: unknown) => {
        this.cmdCreateTaskTitle = String(v ?? '');
      },
      'ui.taskCatalogue.input.cmdCreateTask.description': (v: unknown) => {
        this.cmdCreateTaskDescription = String(v ?? '');
      },
      'ui.taskCatalogue.input.cmdCreateTask.status': (v: unknown) => {
        this.cmdCreateTaskStatus = v as TaskStatus;
      },
      'ui.taskCatalogue.input.cmdCreateTask.priority': (v: unknown) => {
        this.cmdCreateTaskPriority = v as TaskPriority;
      },
      'ui.taskCatalogue.input.cmdCreateTask.dueDate': (v: unknown) => {
        this.cmdCreateTaskDueDate = String(v ?? '');
      },
      'ui.taskCatalogue.input.cmdCreateTask.createdAt': (v: unknown) => {
        this.cmdCreateTaskCreatedAt = String(v ?? '');
      },
      'ui.taskCatalogue.input.cmdCreateTask.updatedAt': (v: unknown) => {
        this.cmdCreateTaskUpdatedAt = String(v ?? '');
      },
      'ui.taskCatalogue.output.cmdCreateTask': (v: unknown) => {
        this.cmdCreateTaskOutput = v as CmdCreateTaskOutput | null;
      },
      'ui.taskCatalogue.action.cmdCreateTask.error': (v: unknown) => {
        this.cmdCreateTaskError = String(v ?? '');
      },
      'ui.taskCatalogue.action.cmdUpdateTask.status': (v: unknown) => {
        this.cmdUpdateTaskState = v as ActionStatus;
      },
      'ui.taskCatalogue.input.cmdUpdateTask.taskId': (v: unknown) => {
        this.cmdUpdateTaskTaskId = String(v ?? '');
      },
      'ui.taskCatalogue.input.cmdUpdateTask.title': (v: unknown) => {
        this.cmdUpdateTaskTitle = String(v ?? '');
      },
      'ui.taskCatalogue.input.cmdUpdateTask.description': (v: unknown) => {
        this.cmdUpdateTaskDescription = String(v ?? '');
      },
      'ui.taskCatalogue.input.cmdUpdateTask.status': (v: unknown) => {
        this.cmdUpdateTaskStatus = v as TaskStatus;
      },
      'ui.taskCatalogue.input.cmdUpdateTask.priority': (v: unknown) => {
        this.cmdUpdateTaskPriority = v as TaskPriority;
      },
      'ui.taskCatalogue.input.cmdUpdateTask.dueDate': (v: unknown) => {
        this.cmdUpdateTaskDueDate = String(v ?? '');
      },
      'ui.taskCatalogue.input.cmdUpdateTask.createdAt': (v: unknown) => {
        this.cmdUpdateTaskCreatedAt = String(v ?? '');
      },
      'ui.taskCatalogue.input.cmdUpdateTask.updatedAt': (v: unknown) => {
        this.cmdUpdateTaskUpdatedAt = String(v ?? '');
      },
      'ui.taskCatalogue.output.cmdUpdateTask': (v: unknown) => {
        this.cmdUpdateTaskOutput = v as CmdUpdateTaskOutput | null;
      },
      'ui.taskCatalogue.action.cmdUpdateTask.error': (v: unknown) => {
        this.cmdUpdateTaskError = String(v ?? '');
      },
      'ui.taskCatalogue.action.cmdDeleteTask.status': (v: unknown) => {
        this.cmdDeleteTaskState = v as ActionStatus;
      },
      'ui.taskCatalogue.input.cmdDeleteTask.taskId': (v: unknown) => {
        this.cmdDeleteTaskTaskId = String(v ?? '');
      },
      'ui.taskCatalogue.output.cmdDeleteTask': (v: unknown) => {
        this.cmdDeleteTaskOutput = v as CmdDeleteTaskOutput | null;
      },
      'ui.taskCatalogue.action.cmdDeleteTask.error': (v: unknown) => {
        this.cmdDeleteTaskError = String(v ?? '');
      },
      'ui.taskCatalogue.action.qryGetTask.status': (v: unknown) => {
        this.qryGetTaskState = v as ActionStatus;
      },
      'ui.taskCatalogue.input.qryGetTask.taskId': (v: unknown) => {
        this.qryGetTaskTaskId = String(v ?? '');
      },
      'ui.taskCatalogue.data.qryGetTask': (v: unknown) => {
        this.qryGetTaskData = v as QryGetTaskOutput | null;
      }
    };
    fields[key]?.(value);
    this.requestUpdate();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    for (const key of this.stateKeys) this.handleIcaStateChange(key, getState(key));
    subscribe(this.stateKeys, this);
    this.subscribed = true;
    void this.loadQryListTask();
  }
  public disconnectedCallback(): void {
    if (this.subscribed) unsubscribe(this.stateKeys, this);
    this.subscribed = false;
    super.disconnectedCallback();
  }

  /** action qryListTask (query) — route todo.taskCatalogue.qryListTask; inputs: search, sortBy, sortOrder; writes ui.taskCatalogue.data.qryListTask; status ui.taskCatalogue.action.qryListTask.status */
  async loadQryListTask(): Promise<void> {
    setState('ui.taskCatalogue.action.qryListTask.status', 'loading');
    this.qryListTaskState = 'loading';
    const params: QryListTaskInput = {
      ...(this.qryListTaskSearch ? { search: this.qryListTaskSearch } : {}),
      ...(this.qryListTaskSortBy ? { sortBy: this.qryListTaskSortBy } : {}),
      ...(this.qryListTaskSortOrder ? { sortOrder: this.qryListTaskSortOrder } : {})
    };
    const response = await execBff<QryListTaskOutput[]>(qryListTaskRoute, params, { mode: 'silent' });
    if (response.ok) {
      const data = response.data ?? [];
      this.qryListTaskData = data;
      setState('ui.taskCatalogue.data.qryListTask', data);
      this.qryListTaskState = 'success';
      setState('ui.taskCatalogue.action.qryListTask.status', 'success');
    } else {
      this.qryListTaskState = 'error';
      setState('ui.taskCatalogue.action.qryListTask.status', 'error');
    }
  }

  /** action cmdCreateTask (command) — route todo.taskCatalogue.cmdCreateTask; inputs: title, description, status, priority, dueDate, createdAt, updatedAt; writes ui.taskCatalogue.output.cmdCreateTask; status ui.taskCatalogue.action.cmdCreateTask.status; feedback keys action.cmdCreateTask.success / action.cmdCreateTask.error */
  async cmdCreateTask(): Promise<void> {
    await this.executeCreateTask(undefined);
  }
  /** handler for action cmdCreateTask — bind UI events here */
  handleCmdCreateTaskClick(_event: Event): void {
    void runBlockingUiAction(() => this.cmdCreateTask(), { mode: 'blocking' });
  }

  private async executeCreateTask(signal: AbortSignal | undefined): Promise<void> {
    setState('ui.taskCatalogue.action.cmdCreateTask.status', 'loading');
    const params: CmdCreateTaskInput = {
      title: this.cmdCreateTaskTitle,
      ...(this.cmdCreateTaskDescription ? { description: this.cmdCreateTaskDescription } : {}),
      status: this.cmdCreateTaskStatus as CmdCreateTaskInput['status'],
      priority: this.cmdCreateTaskPriority as CmdCreateTaskInput['priority'],
      ...(this.cmdCreateTaskDueDate ? { dueDate: this.cmdCreateTaskDueDate } : {}),
      createdAt: this.cmdCreateTaskCreatedAt,
      updatedAt: this.cmdCreateTaskUpdatedAt
    };
    const options: BffClientOptions = { mode: 'blocking', ...(signal ? { signal } : {}) };
    const response = await execBff<CmdCreateTaskOutput>(cmdCreateTaskRoute, params, options);
    if (!response.ok) {
      const message = response.error?.message ?? 'action.cmdCreateTask.error';
      this.cmdCreateTaskError = message;
      setState('ui.taskCatalogue.action.cmdCreateTask.error', message);
      setState('ui.taskCatalogue.action.cmdCreateTask.status', 'error');
      return;
    }
    const data = response.data ?? null;
    this.cmdCreateTaskOutput = data;
    setState('ui.taskCatalogue.output.cmdCreateTask', data);
    await this.loadQryListTask();
    for (const key of ['ui.taskCatalogue.input.cmdCreateTask.title', 'ui.taskCatalogue.input.cmdCreateTask.description', 'ui.taskCatalogue.input.cmdCreateTask.status', 'ui.taskCatalogue.input.cmdCreateTask.priority', 'ui.taskCatalogue.input.cmdCreateTask.dueDate', 'ui.taskCatalogue.input.cmdCreateTask.createdAt', 'ui.taskCatalogue.input.cmdCreateTask.updatedAt']) setState(key, '');
    setState('ui.taskCatalogue.action.cmdCreateTask.status', 'success');
  }

  /** action cmdUpdateTask (command) — route todo.taskCatalogue.cmdUpdateTask; inputs: taskId, title, description, status, priority, dueDate, createdAt, updatedAt; writes ui.taskCatalogue.output.cmdUpdateTask; status ui.taskCatalogue.action.cmdUpdateTask.status; feedback keys action.cmdUpdateTask.success / action.cmdUpdateTask.error */
  async cmdUpdateTask(): Promise<void> {
    setState('ui.taskCatalogue.action.cmdUpdateTask.status', 'loading');
    const params: CmdUpdateTaskInput = {
      taskId: this.cmdUpdateTaskTaskId,
      title: this.cmdUpdateTaskTitle,
      description: this.cmdUpdateTaskDescription,
      status: this.cmdUpdateTaskStatus as CmdUpdateTaskInput['status'],
      priority: this.cmdUpdateTaskPriority as CmdUpdateTaskInput['priority'],
      dueDate: this.cmdUpdateTaskDueDate,
      createdAt: this.cmdUpdateTaskCreatedAt,
      updatedAt: this.cmdUpdateTaskUpdatedAt
    };
    const response = await execBff<CmdUpdateTaskOutput>(cmdUpdateTaskRoute, params, { mode: 'blocking' });
    if (!response.ok) {
      const message = response.error?.message ?? 'action.cmdUpdateTask.error';
      this.cmdUpdateTaskError = message;
      setState('ui.taskCatalogue.action.cmdUpdateTask.error', message);
      setState('ui.taskCatalogue.action.cmdUpdateTask.status', 'error');
      return;
    }
    const data = response.data ?? null;
    this.cmdUpdateTaskOutput = data;
    setState('ui.taskCatalogue.output.cmdUpdateTask', data);
    await this.loadQryListTask();
    setState('ui.taskCatalogue.action.cmdUpdateTask.status', 'success');
  }
  /** handler for action cmdUpdateTask — bind UI events here */
  handleCmdUpdateTaskClick(_event: Event): void {
    void runBlockingUiAction(() => this.cmdUpdateTask(), { mode: 'blocking' });
  }

  /** action cmdDeleteTask (command) — route todo.taskCatalogue.cmdDeleteTask; inputs: taskId; writes ui.taskCatalogue.output.cmdDeleteTask; status ui.taskCatalogue.action.cmdDeleteTask.status; feedback keys action.cmdDeleteTask.success / action.cmdDeleteTask.error */
  async cmdDeleteTask(): Promise<void> {
    setState('ui.taskCatalogue.action.cmdDeleteTask.status', 'loading');
    const response = await execBff<CmdDeleteTaskOutput>(cmdDeleteTaskRoute, { taskId: this.cmdDeleteTaskTaskId }, { mode: 'blocking' });
    if (!response.ok) {
      const message = response.error?.message ?? 'action.cmdDeleteTask.error';
      this.cmdDeleteTaskError = message;
      setState('ui.taskCatalogue.action.cmdDeleteTask.error', message);
      setState('ui.taskCatalogue.action.cmdDeleteTask.status', 'error');
      return;
    }
    const data = response.data ?? null;
    this.cmdDeleteTaskOutput = data;
    setState('ui.taskCatalogue.output.cmdDeleteTask', data);
    await this.loadQryListTask();
    setState('ui.taskCatalogue.action.cmdDeleteTask.status', 'success');
  }
  /** handler for action cmdDeleteTask — bind UI events here */
  handleCmdDeleteTaskClick(_event: Event): void {
    void runBlockingUiAction(() => this.cmdDeleteTask(), { mode: 'blocking' });
  }

  /** action qryGetTask (query) — route todo.taskCatalogue.qryGetTask; inputs: taskId; writes ui.taskCatalogue.data.qryGetTask; status ui.taskCatalogue.action.qryGetTask.status */
  async loadQryGetTask(): Promise<void> {
    if (!this.qryGetTaskTaskId) return;
    setState('ui.taskCatalogue.action.qryGetTask.status', 'loading');
    const response = await execBff<QryGetTaskOutput>(qryGetTaskRoute, { taskId: this.qryGetTaskTaskId } as QryGetTaskInput, { mode: 'silent' });
    if (response.ok) {
      const data = response.data ?? null;
      this.qryGetTaskData = data;
      setState('ui.taskCatalogue.data.qryGetTask', data);
      setState('ui.taskCatalogue.action.qryGetTask.status', 'success');
    }
    else setState('ui.taskCatalogue.action.qryGetTask.status', 'error');
  }
  /** handler for action qryGetTask — bind UI events here */
  handleQryGetTaskClick(_event: Event): void {
    void this.loadQryGetTask();
  }

  /** setter for state ui.taskCatalogue.input.qryListTask.search */
  setQryListTaskSearch(value: string): void {
    this.qryListTaskSearch = value;
    setState('ui.taskCatalogue.input.qryListTask.search', value);
    this.requestUpdate();
  }
  /** handler for action set.qryListTaskSearch — bind UI events here */
  handleQryListTaskSearchChange(event: Event): void {
    this.setQryListTaskSearch((event.target as HTMLInputElement).value);
  }
  /** setter for state ui.taskCatalogue.input.qryListTask.sortBy */
  setQryListTaskSortBy(value: QryListTaskInput['sortBy'] | ''): void {
    this.qryListTaskSortBy = value;
    setState('ui.taskCatalogue.input.qryListTask.sortBy', value);
  }
  /** handler for action set.qryListTaskSortBy — bind UI events here */
  handleQryListTaskSortByChange(event: Event): void {
    this.setQryListTaskSortBy((event.target as HTMLSelectElement).value as QryListTaskInput['sortBy'] | '');
  }
  /** setter for state ui.taskCatalogue.input.qryListTask.sortOrder */
  setQryListTaskSortOrder(value: QryListTaskInput['sortOrder'] | ''): void {
    this.qryListTaskSortOrder = value;
    setState('ui.taskCatalogue.input.qryListTask.sortOrder', value);
  }
  /** handler for action set.qryListTaskSortOrder — bind UI events here */
  handleQryListTaskSortOrderChange(event: Event): void {
    this.setQryListTaskSortOrder((event.target as HTMLSelectElement).value as QryListTaskInput['sortOrder'] | '');
  }

  private setString(stateKey: string, value: string): void {
    setState(stateKey, value);
  }
  /** setter for state ui.taskCatalogue.input.cmdCreateTask.title */ setCmdCreateTaskTitle(v: string): void {
    this.cmdCreateTaskTitle = v;
    this.setString('ui.taskCatalogue.input.cmdCreateTask.title', v);
  }
  /** setter for state ui.taskCatalogue.input.cmdCreateTask.description */ setCmdCreateTaskDescription(v: string): void {
    this.cmdCreateTaskDescription = v;
    this.setString('ui.taskCatalogue.input.cmdCreateTask.description', v);
  }
  /** setter for state ui.taskCatalogue.input.cmdCreateTask.status */ setCmdCreateTaskStatus(v: TaskStatus): void {
    this.cmdCreateTaskStatus = v;
    this.setString('ui.taskCatalogue.input.cmdCreateTask.status', v);
  }
  /** setter for state ui.taskCatalogue.input.cmdCreateTask.priority */ setCmdCreateTaskPriority(v: TaskPriority): void {
    this.cmdCreateTaskPriority = v;
    this.setString('ui.taskCatalogue.input.cmdCreateTask.priority', v);
  }
  /** setter for state ui.taskCatalogue.input.cmdCreateTask.dueDate */ setCmdCreateTaskDueDate(v: string): void {
    this.cmdCreateTaskDueDate = v;
    this.setString('ui.taskCatalogue.input.cmdCreateTask.dueDate', v);
  }
  /** setter for state ui.taskCatalogue.input.cmdCreateTask.createdAt */ setCmdCreateTaskCreatedAt(v: string): void {
    this.cmdCreateTaskCreatedAt = v;
    this.setString('ui.taskCatalogue.input.cmdCreateTask.createdAt', v);
  }
  /** setter for state ui.taskCatalogue.input.cmdCreateTask.updatedAt */ setCmdCreateTaskUpdatedAt(v: string): void {
    this.cmdCreateTaskUpdatedAt = v;
    this.setString('ui.taskCatalogue.input.cmdCreateTask.updatedAt', v);
  }
  /** setter for state ui.taskCatalogue.input.cmdUpdateTask.taskId */ setCmdUpdateTaskTaskId(v: string): void {
    this.cmdUpdateTaskTaskId = v;
    this.setString('ui.taskCatalogue.input.cmdUpdateTask.taskId', v);
    const row = this.qryListTaskData.find((item: QryListTaskOutput) => String(item.taskId) === String(v));
    if (row) {
      if (row.title != null) this.setCmdUpdateTaskTitle(row.title);
      if (row.description != null) this.setCmdUpdateTaskDescription(row.description);
      if (row.status != null) this.setCmdUpdateTaskStatus(row.status);
      if (row.priority != null) this.setCmdUpdateTaskPriority(row.priority);
      if (row.dueDate != null) this.setCmdUpdateTaskDueDate(row.dueDate);
      if (row.createdAt != null) this.setCmdUpdateTaskCreatedAt(row.createdAt);
      if (row.updatedAt != null) this.setCmdUpdateTaskUpdatedAt(row.updatedAt);
    }
  }
  /** setter for state ui.taskCatalogue.input.cmdUpdateTask.title */ setCmdUpdateTaskTitle(v: string): void {
    this.cmdUpdateTaskTitle = v;
    this.setString('ui.taskCatalogue.input.cmdUpdateTask.title', v);
  }
  /** setter for state ui.taskCatalogue.input.cmdUpdateTask.description */ setCmdUpdateTaskDescription(v: string): void {
    this.cmdUpdateTaskDescription = v;
    this.setString('ui.taskCatalogue.input.cmdUpdateTask.description', v);
  }
  /** setter for state ui.taskCatalogue.input.cmdUpdateTask.status */ setCmdUpdateTaskStatus(v: TaskStatus): void {
    this.cmdUpdateTaskStatus = v;
    this.setString('ui.taskCatalogue.input.cmdUpdateTask.status', v);
  }
  /** setter for state ui.taskCatalogue.input.cmdUpdateTask.priority */ setCmdUpdateTaskPriority(v: TaskPriority): void {
    this.cmdUpdateTaskPriority = v;
    this.setString('ui.taskCatalogue.input.cmdUpdateTask.priority', v);
  }
  /** setter for state ui.taskCatalogue.input.cmdUpdateTask.dueDate */ setCmdUpdateTaskDueDate(v: string): void {
    this.cmdUpdateTaskDueDate = v;
    this.setString('ui.taskCatalogue.input.cmdUpdateTask.dueDate', v);
  }
  /** setter for state ui.taskCatalogue.input.cmdUpdateTask.createdAt */ setCmdUpdateTaskCreatedAt(v: string): void {
    this.cmdUpdateTaskCreatedAt = v;
    this.setString('ui.taskCatalogue.input.cmdUpdateTask.createdAt', v);
  }
  /** setter for state ui.taskCatalogue.input.cmdUpdateTask.updatedAt */ setCmdUpdateTaskUpdatedAt(v: string): void {
    this.cmdUpdateTaskUpdatedAt = v;
    this.setString('ui.taskCatalogue.input.cmdUpdateTask.updatedAt', v);
  }
  /** setter for state ui.taskCatalogue.input.cmdDeleteTask.taskId */ setCmdDeleteTaskTaskId(v: string): void {
    this.cmdDeleteTaskTaskId = v;
    this.setString('ui.taskCatalogue.input.cmdDeleteTask.taskId', v);
  }
  /** setter for state ui.taskCatalogue.input.qryGetTask.taskId */ setQryGetTaskTaskId(v: string): void {
    this.qryGetTaskTaskId = v;
    this.setString('ui.taskCatalogue.input.qryGetTask.taskId', v);
  }

  /** handler for action set.cmdCreateTaskTitle — bind UI events here */ handleCmdCreateTaskTitleChange(e: Event): void {
    this.setCmdCreateTaskTitle((e.target as HTMLInputElement).value);
  }
  /** handler for action set.cmdCreateTaskDescription — bind UI events here */ handleCmdCreateTaskDescriptionChange(e: Event): void {
    this.setCmdCreateTaskDescription((e.target as HTMLInputElement).value);
  }
  /** handler for action set.cmdCreateTaskStatus — bind UI events here */ handleCmdCreateTaskStatusChange(e: Event): void {
    this.setCmdCreateTaskStatus((e.target as HTMLSelectElement).value as TaskStatus);
  }
  /** handler for action set.cmdCreateTaskPriority — bind UI events here */ handleCmdCreateTaskPriorityChange(e: Event): void {
    this.setCmdCreateTaskPriority((e.target as HTMLSelectElement).value as TaskPriority);
  }
  /** handler for action set.cmdCreateTaskDueDate — bind UI events here */ handleCmdCreateTaskDueDateChange(e: Event): void {
    this.setCmdCreateTaskDueDate((e.target as HTMLInputElement).value);
  }
  /** handler for action set.cmdCreateTaskCreatedAt — bind UI events here */ handleCmdCreateTaskCreatedAtChange(e: Event): void {
    this.setCmdCreateTaskCreatedAt((e.target as HTMLInputElement).value);
  }
  /** handler for action set.cmdCreateTaskUpdatedAt — bind UI events here */ handleCmdCreateTaskUpdatedAtChange(e: Event): void {
    this.setCmdCreateTaskUpdatedAt((e.target as HTMLInputElement).value);
  }
  /** handler for action set.cmdUpdateTaskTaskId — bind UI events here */ handleCmdUpdateTaskTaskIdChange(e: Event): void {
    this.setCmdUpdateTaskTaskId((e.target as HTMLInputElement).value);
  }
  /** handler for action set.cmdUpdateTaskTitle — bind UI events here */ handleCmdUpdateTaskTitleChange(e: Event): void {
    this.setCmdUpdateTaskTitle((e.target as HTMLInputElement).value);
  }
  /** handler for action set.cmdUpdateTaskDescription — bind UI events here */ handleCmdUpdateTaskDescriptionChange(e: Event): void {
    this.setCmdUpdateTaskDescription((e.target as HTMLInputElement).value);
  }
  /** handler for action set.cmdUpdateTaskStatus — bind UI events here */ handleCmdUpdateTaskStatusChange(e: Event): void {
    this.setCmdUpdateTaskStatus((e.target as HTMLSelectElement).value as TaskStatus);
  }
  /** handler for action set.cmdUpdateTaskPriority — bind UI events here */ handleCmdUpdateTaskPriorityChange(e: Event): void {
    this.setCmdUpdateTaskPriority((e.target as HTMLSelectElement).value as TaskPriority);
  }
  /** handler for action set.cmdUpdateTaskDueDate — bind UI events here */ handleCmdUpdateTaskDueDateChange(e: Event): void {
    this.setCmdUpdateTaskDueDate((e.target as HTMLInputElement).value);
  }
  /** handler for action set.cmdUpdateTaskCreatedAt — bind UI events here */ handleCmdUpdateTaskCreatedAtChange(e: Event): void {
    this.setCmdUpdateTaskCreatedAt((e.target as HTMLInputElement).value);
  }
  /** handler for action set.cmdUpdateTaskUpdatedAt — bind UI events here */ handleCmdUpdateTaskUpdatedAtChange(e: Event): void {
    this.setCmdUpdateTaskUpdatedAt((e.target as HTMLInputElement).value);
  }
  /** handler for action set.cmdDeleteTaskTaskId — bind UI events here */ handleCmdDeleteTaskTaskIdChange(e: Event): void {
    this.setCmdDeleteTaskTaskId((e.target as HTMLInputElement).value);
  }
  /** handler for action set.qryGetTaskTaskId — bind UI events here */ handleQryGetTaskTaskIdChange(e: Event): void {
    this.setQryGetTaskTaskId((e.target as HTMLInputElement).value);
  }
}
`;
