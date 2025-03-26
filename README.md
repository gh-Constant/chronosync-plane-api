# Plane API Client

A TypeScript client for interacting with the Plane project management API.

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in your project root with the following variables:

```env
PLANE_API_URL=your_plane_instance_url
PLANE_API_KEY=your_api_key
WORKSPACE_SLUG=your_workspace_slug
PROJECT_NAME=your_project_name
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PLANE_API_URL` | The base URL of your Plane instance | Yes |
| `PLANE_API_KEY` | Your Plane API key (with `plane_api_` prefix) | Yes |
| `WORKSPACE_SLUG` | The slug of your workspace | Yes |
| `PROJECT_NAME` | The name of your project | Yes |

## Usage

```typescript
import { PlaneClient } from './src/planeClient';

async function main() {
  // Create a new instance of the PlaneClient
  const client = new PlaneClient();

  // Initialize the client (required before creating issues)
  await client.initialize();

  // Create a new issue
  const issue = await client.createIssue({
    name: "Task name",
    description: "Task description",
    priority: "high"
  });
}
```

## API Documentation

### `PlaneClient`

The main class for interacting with the Plane API.

#### Constructor

```typescript
const client = new PlaneClient();
```

Creates a new instance of the PlaneClient. Automatically loads configuration from environment variables.

**Throws:**
- `Error` if required environment variables are missing

#### Methods

### `initialize()`

```typescript
async initialize(): Promise<void>
```

Initializes the client by fetching the project ID based on the project name from environment variables.
Must be called before creating issues.

**Throws:**
- `Error` if project is not found
- `Error` if API response format is unexpected
- `AxiosError` for network-related errors

### `createIssue(payload)`

```typescript
async createIssue(payload: IssueCreatePayload): Promise<any>
```

Creates a new issue in the project.

**Parameters:**

`payload`: An object containing the issue details:

```typescript
interface IssueCreatePayload {
  name: string;              // Required: Issue title
  description?: string;      // Optional: Issue description
  priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none';  // Optional: Issue priority
  state?: string;           // Optional: Issue state
  assignees?: string[];     // Optional: Array of assignee IDs
  labels?: string[];        // Optional: Array of label IDs
}
```

**Returns:**
- Promise resolving to the created issue data

**Throws:**
- `Error` if client is not initialized
- `AxiosError` for API-related errors

## Error Handling

The client includes comprehensive error handling and logging:

- Network errors are logged with detailed information
- API responses are intercepted and logged
- Validation errors are caught and reported
- Authentication errors are handled with clear messages

## Example

```typescript
import { PlaneClient } from './src/planeClient';

async function main() {
  try {
    const client = new PlaneClient();
    await client.initialize();
    
    const issue = await client.createIssue({
      name: "Implement new feature",
      description: "Add authentication to the API",
      priority: "high",
      labels: ["backend", "security"]
    });
    
    console.log('Issue created:', issue);
  } catch (error) {
    console.error('Failed to create issue:', error);
  }
}

main();
```

## Development

### Building the Project

```bash
npm run build
```

### Running the Example

```bash
npm run start
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 