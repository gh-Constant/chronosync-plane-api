import axios, { AxiosInstance, AxiosError } from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Interface representing the payload for creating an issue
 * @interface IssueCreatePayload
 */
export interface IssueCreatePayload {
  /** The title/name of the issue */
  name: string;
  /** Optional description of the issue */
  description?: string;
  /** Optional priority level of the issue */
  priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none';
  /** Optional state of the issue */
  state?: string;
  /** Optional array of assignee IDs */
  assignees?: string[];
  /** Optional array of label IDs */
  labels?: string[];
  /** Optional parent issue ID */
  parent?: string;
}

/**
 * Interface representing a project member
 * @interface ProjectMember
 */
interface ProjectMember {
  id: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  role: 'admin' | 'member' | 'viewer';
}

/**
 * Interface representing a project
 * @interface Project
 */
interface Project {
  id: string;
  name: string;
  identifier: string;
  description?: string;
  network: number;
  workspace: {
    id: string;
    slug: string;
    name: string;
  };
}

/**
 * Interface representing an issue state
 * @interface IssueState
 */
interface IssueState {
  id: string;
  name: string;
  color: string;
  group: 'backlog' | 'unstarted' | 'started' | 'completed' | 'cancelled';
}

/**
 * Interface representing a label
 * @interface Label
 */
interface Label {
  id: string;
  name: string;
  color: string;
  description?: string;
}

/**
 * Interface for creating a label
 * @interface LabelCreatePayload
 */
interface LabelCreatePayload {
  name: string;
  color: string;
  description?: string;
}

/**
 * Client for interacting with the Plane project management API
 * @class PlaneClient
 */
export class PlaneClient {
  private client: AxiosInstance;
  private workspaceSlug: string;
  private projectId?: string;

  /**
   * Creates an instance of PlaneClient.
   * @throws {Error} When required environment variables are missing
   */
  constructor() {
    if (!process.env.PLANE_API_URL || !process.env.PLANE_API_KEY || !process.env.WORKSPACE_SLUG) {
      throw new Error('Missing required environment variables');
    }

    this.workspaceSlug = process.env.WORKSPACE_SLUG;
    
    // Log configuration for debugging
    console.log('Initializing Plane client with:', {
      baseURL: process.env.PLANE_API_URL,
      workspaceSlug: this.workspaceSlug,
      apiKeyLength: process.env.PLANE_API_KEY.length
    });

    this.client = axios.create({
      baseURL: process.env.PLANE_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.PLANE_API_KEY
      }
    });

    // Add response interceptor for debugging
    this.client.interceptors.response.use(
      response => {
        console.log('Response Headers:', response.headers);
        return response;
      },
      error => {
        if (error.response) {
          console.error('Error Response:', {
            status: error.response.status,
            headers: error.response.headers,
            data: error.response.data
          });
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Initializes the client by fetching and setting the project ID
   * Must be called before creating issues
   * @throws {Error} When project is not found or API response format is unexpected
   * @throws {AxiosError} When network or API errors occur
   */
  async initialize() {
    try {
      console.log('Fetching projects...');
      const response = await this.client.get(`/api/v1/workspaces/${this.workspaceSlug}/projects/`);
      
      console.log('API Response:', JSON.stringify(response.data, null, 2));
      
      const projects = response.data.results || response.data;
      if (!Array.isArray(projects)) {
        console.error('Unexpected response format:', response.data);
        throw new Error('Unexpected API response format');
      }

      console.log('Found projects:', projects.map(p => p.name));
      
      const project = projects.find((p: any) => p.name === process.env.PROJECT_NAME);
      if (!project) {
        throw new Error(`Project ${process.env.PROJECT_NAME} not found`);
      }

      this.projectId = project.id;
      console.log('Selected project ID:', this.projectId);
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Network error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      throw error;
    }
  }

  /**
   * Creates a new issue in the project
   * @param {IssueCreatePayload} payload - The issue details
   * @returns {Promise<any>} The created issue data
   * @throws {Error} When client is not initialized
   * @throws {AxiosError} When network or API errors occur
   */
  async createIssue(payload: IssueCreatePayload) {
    if (!this.projectId) {
      throw new Error('Client not initialized. Call initialize() first');
    }

    try {
      console.log('Creating issue with payload:', payload);
      const response = await this.client.post(
        `/api/v1/workspaces/${this.workspaceSlug}/projects/${this.projectId}/issues/`,
        payload
      );
      console.log('Issue created successfully:', response.data);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Failed to create issue:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
      throw error;
    }
  }

  /**
   * Get all members of the current project
   * @returns {Promise<ProjectMember[]>} Array of project members
   * @throws {Error} When client is not initialized
   * @throws {AxiosError} When network or API errors occur
   */
  async getProjectMembers(): Promise<ProjectMember[]> {
    if (!this.projectId) {
      throw new Error('Client not initialized. Call initialize() first');
    }

    try {
      const response = await this.client.get(
        `/api/v1/workspaces/${this.workspaceSlug}/projects/${this.projectId}/members/`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch project members:', error);
      throw error;
    }
  }

  /**
   * Get all projects in the workspace
   * @returns {Promise<Project[]>} Array of projects
   * @throws {AxiosError} When network or API errors occur
   */
  async getProjects(): Promise<Project[]> {
    try {
      const response = await this.client.get(
        `/api/v1/workspaces/${this.workspaceSlug}/projects/`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      throw error;
    }
  }

  /**
   * Get all states defined for the current project
   * @returns {Promise<IssueState[]>} Array of issue states
   * @throws {Error} When client is not initialized
   * @throws {AxiosError} When network or API errors occur
   */
  async getIssueStates(): Promise<IssueState[]> {
    if (!this.projectId) {
      throw new Error('Client not initialized. Call initialize() first');
    }

    try {
      const response = await this.client.get(
        `/api/v1/workspaces/${this.workspaceSlug}/projects/${this.projectId}/states/`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch issue states:', error);
      throw error;
    }
  }

  /**
   * Get all labels for the current project
   * @returns {Promise<Label[]>} Array of labels
   * @throws {Error} When client is not initialized
   * @throws {AxiosError} When network or API errors occur
   */
  async getLabels(): Promise<Label[]> {
    if (!this.projectId) {
      throw new Error('Client not initialized. Call initialize() first');
    }

    try {
      const response = await this.client.get(
        `/api/v1/workspaces/${this.workspaceSlug}/projects/${this.projectId}/labels/`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch labels:', error);
      throw error;
    }
  }

  /**
   * Creates a new label in the project
   * @param {LabelCreatePayload} payload - The label details
   * @returns {Promise<Label>} The created label
   * @throws {Error} When client is not initialized
   * @throws {AxiosError} When network or API errors occur
   */
  async createLabel(payload: LabelCreatePayload): Promise<Label> {
    if (!this.projectId) {
      throw new Error('Client not initialized. Call initialize() first');
    }

    try {
      console.log('Creating label with payload:', payload);
      const response = await this.client.post(
        `/api/v1/workspaces/${this.workspaceSlug}/projects/${this.projectId}/labels/`,
        payload
      );
      console.log('Label created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to create label:', error);
      throw error;
    }
  }

  /**
   * Check if a state with the given name exists, creating it if necessary
   * @param {string} stateName - The name of the state to check/create
   * @param {string} group - The group the state belongs to
   * @returns {Promise<string>} The ID of the existing or created state
   * @throws {Error} When client is not initialized
   * @throws {AxiosError} When network or API errors occur
   */
  async ensureStateExists(stateName: string, group: 'backlog' | 'unstarted' | 'started' | 'completed' | 'cancelled'): Promise<string> {
    if (!this.projectId) {
      throw new Error('Client not initialized. Call initialize() first');
    }

    const states = await this.getIssueStates();
    const existingState = states.find(s => s.name.toLowerCase() === stateName.toLowerCase());
    
    if (existingState) {
      return existingState.id;
    }
    
    // For now, return an empty string if state doesn't exist
    // State creation requires more complex API calls that might be beyond the scope
    console.warn(`State "${stateName}" not found. State creation via API is not implemented.`);
    return '';
  }

  /**
   * Get all issues for the current project
   * @param {Object} params - Pagination parameters
   * @returns {Promise<any>} The issues data
   * @throws {Error} When client is not initialized
   * @throws {AxiosError} When network or API errors occur
   */
  async getIssues(params: { page?: number; perPage?: number } = {}): Promise<any> {
    if (!this.projectId) {
      throw new Error('Client not initialized. Call initialize() first');
    }

    const { page = 1, perPage = 20 } = params;

    try {
      const response = await this.client.get(
        `/api/v1/workspaces/${this.workspaceSlug}/projects/${this.projectId}/issues/`,
        {
          params: {
            page,
            per_page: perPage
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch issues:', error);
      throw error;
    }
  }

  /**
   * Updates an existing issue in the project
   * @param {string} issueId - The ID of the issue to update
   * @param {Partial<IssueCreatePayload>} payload - The updated issue details
   * @returns {Promise<any>} The updated issue data
   * @throws {Error} When client is not initialized
   * @throws {AxiosError} When network or API errors occur
   */
  async updateIssue(issueId: string, payload: Partial<IssueCreatePayload>): Promise<any> {
    if (!this.projectId) {
      throw new Error('Client not initialized. Call initialize() first');
    }

    try {
      console.log(`Updating issue ${issueId} with payload:`, payload);
      const response = await this.client.patch(
        `/api/v1/workspaces/${this.workspaceSlug}/projects/${this.projectId}/issues/${issueId}/`,
        payload
      );
      console.log('Issue updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to update issue ${issueId}:`, error);
      throw error;
    }
  }

  /**
   * Deletes an issue from the project
   * @param {string} issueId - The ID of the issue to delete
   * @returns {Promise<void>}
   * @throws {Error} When client is not initialized
   * @throws {AxiosError} When network or API errors occur
   */
  async deleteIssue(issueId: string): Promise<void> {
    if (!this.projectId) {
      throw new Error('Client not initialized. Call initialize() first');
    }

    try {
      console.log(`Deleting issue ${issueId}`);
      await this.client.delete(
        `/api/v1/workspaces/${this.workspaceSlug}/projects/${this.projectId}/issues/${issueId}/`
      );
      console.log(`Issue ${issueId} deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete issue ${issueId}:`, error);
      throw error;
    }
  }

  /**
   * Adds a comment to an issue
   * @param {string} issueId - The ID of the issue to comment on
   * @param {string} comment - The comment text
   * @returns {Promise<any>} The created comment data
   * @throws {Error} When client is not initialized
   * @throws {AxiosError} When network or API errors occur
   */
  async addIssueComment(issueId: string, comment: string): Promise<any> {
    if (!this.projectId) {
      throw new Error('Client not initialized. Call initialize() first');
    }

    try {
      console.log(`Adding comment to issue ${issueId}`);
      const response = await this.client.post(
        `/api/v1/workspaces/${this.workspaceSlug}/projects/${this.projectId}/issues/${issueId}/comments/`,
        { comment_html: comment }
      );
      console.log('Comment added successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to add comment to issue ${issueId}:`, error);
      throw error;
    }
  }
} 