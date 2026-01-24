/**
 * OpenAPI Specification for LooK API
 * 
 * Provides interactive API documentation via Swagger UI
 */

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'LooK API',
    version: '2.1.0',
    description: `
# LooK - AI-Powered Demo Video Generator

Generate professional product demo videos from any website with AI-powered analysis, 
intelligent cursor tracking, and automated voiceover.

## Authentication

API keys can be provided via headers:
- \`X-OpenAI-Key\`: OpenAI API key for AI analysis and TTS
- \`X-Groq-Key\`: Groq API key for script generation (optional)

## WebSocket

Connect to \`ws://host:port\` for real-time updates during recording and rendering.

### Events
- \`status\`: Progress updates with stage and message
- \`live-frame\`: Base64 encoded preview frame during live recording
- \`error\`: Error notifications
    `,
    contact: {
      name: 'LooK Support',
      url: 'https://github.com/nirholas/LooK/issues'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3847',
      description: 'Local development server'
    }
  ],
  tags: [
    { name: 'Health', description: 'Server health and diagnostics' },
    { name: 'Projects', description: 'Project management' },
    { name: 'Analysis', description: 'Website analysis and script generation' },
    { name: 'Recording', description: 'Video recording operations' },
    { name: 'Live', description: 'Live recording sessions' },
    { name: 'Import', description: 'Import from Git repos or websites' },
    { name: 'Render', description: 'Video rendering and export' },
    { name: 'Markers', description: 'Timeline markers and chapters' }
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns server health status and service availability',
        operationId: 'getHealth',
        parameters: [
          {
            name: 'full',
            in: 'query',
            description: 'Run full diagnostics including Playwright browser check',
            schema: { type: 'boolean', default: false }
          }
        ],
        responses: {
          200: {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
                example: {
                  status: 'ok',
                  version: '2.1.0',
                  services: {
                    openai: 'connected',
                    groq: 'not-configured',
                    playwright: 'ready'
                  },
                  uptime: 3600,
                  timestamp: '2026-01-24T12:00:00.000Z'
                }
              }
            }
          }
        }
      }
    },
    '/api/stats': {
      get: {
        tags: ['Health'],
        summary: 'Usage statistics',
        description: 'Returns usage metrics for monitoring dashboards',
        operationId: 'getStats',
        responses: {
          200: {
            description: 'Usage statistics',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StatsResponse' }
              }
            }
          }
        }
      }
    },
    '/api/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List all projects',
        description: 'Returns a list of all saved projects',
        operationId: 'listProjects',
        responses: {
          200: {
            description: 'List of projects',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    projects: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ProjectSummary' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/project/{id}': {
      get: {
        tags: ['Projects'],
        summary: 'Get project details',
        description: 'Returns full details for a specific project',
        operationId: 'getProject',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Project UUID',
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          200: {
            description: 'Project details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Project' }
              }
            }
          },
          404: {
            description: 'Project not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Projects'],
        summary: 'Delete a project',
        description: 'Permanently deletes a project and all associated files',
        operationId: 'deleteProject',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Project UUID',
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          200: {
            description: 'Project deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' } }
                }
              }
            }
          },
          404: { $ref: '#/components/responses/NotFound' }
        }
      }
    },
    '/api/analyze': {
      post: {
        tags: ['Analysis'],
        summary: 'Analyze a website',
        description: 'Captures a screenshot and uses AI to analyze the website, then generates a demo script',
        operationId: 'analyzeWebsite',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AnalyzeRequest' },
              example: {
                url: 'https://example.com',
                duration: 25,
                style: 'professional'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Analysis complete',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AnalyzeResponse' }
              }
            }
          },
          400: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/ServerError' }
        }
      }
    },
    '/api/record': {
      post: {
        tags: ['Recording'],
        summary: 'Start recording',
        description: 'Starts automated recording of a website demo',
        operationId: 'startRecording',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RecordRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Recording started',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RecordResponse' }
              }
            }
          },
          400: { $ref: '#/components/responses/BadRequest' }
        }
      }
    },
    '/api/import': {
      post: {
        tags: ['Import'],
        summary: 'Import project from URL',
        description: 'Imports a project from a website URL or Git repository',
        operationId: 'importProject',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ImportRequest' },
              examples: {
                website: {
                  summary: 'Import from website',
                  value: { url: 'https://example.com', type: 'website' }
                },
                github: {
                  summary: 'Import from GitHub',
                  value: { url: 'https://github.com/user/repo', type: 'git' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Import started',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ImportResponse' }
              }
            }
          },
          400: { $ref: '#/components/responses/BadRequest' }
        }
      }
    },
    '/api/import/{projectId}/status': {
      get: {
        tags: ['Import'],
        summary: 'Get import status',
        description: 'Returns the current status of an import operation',
        operationId: 'getImportStatus',
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          200: {
            description: 'Import status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ImportStatus' }
              }
            }
          },
          404: { $ref: '#/components/responses/NotFound' }
        }
      }
    },
    '/api/live/start': {
      post: {
        tags: ['Live'],
        summary: 'Start live recording session',
        description: 'Starts a live recording session with real-time preview',
        operationId: 'startLiveSession',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LiveStartRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Live session started',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LiveSessionResponse' }
              }
            }
          }
        }
      }
    },
    '/api/live/{sessionId}/stop': {
      post: {
        tags: ['Live'],
        summary: 'Stop live recording',
        description: 'Stops a live recording session and saves the recording',
        operationId: 'stopLiveSession',
        parameters: [
          {
            name: 'sessionId',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'Session stopped',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LiveStopResponse' }
              }
            }
          },
          404: { $ref: '#/components/responses/NotFound' }
        }
      }
    },
    '/api/render': {
      post: {
        tags: ['Render'],
        summary: 'Render final video',
        description: 'Renders the final video with all effects, voiceover, and export settings',
        operationId: 'renderVideo',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RenderRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Render complete',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RenderResponse' }
              }
            }
          }
        }
      }
    },
    '/api/download/{projectId}': {
      get: {
        tags: ['Render'],
        summary: 'Download video',
        description: 'Downloads the rendered video file',
        operationId: 'downloadVideo',
        parameters: [
          {
            name: 'projectId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          200: {
            description: 'Video file',
            content: {
              'video/mp4': {
                schema: { type: 'string', format: 'binary' }
              }
            }
          },
          404: { $ref: '#/components/responses/NotFound' }
        }
      }
    },
    '/api/project/{id}/markers': {
      get: {
        tags: ['Markers'],
        summary: 'Get project markers',
        description: 'Returns all timeline markers for a project',
        operationId: 'getMarkers',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          200: {
            description: 'Markers list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    markers: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Marker' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      put: {
        tags: ['Markers'],
        summary: 'Update project markers',
        description: 'Updates all timeline markers for a project',
        operationId: 'updateMarkers',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  markers: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Marker' }
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Markers updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' } }
                }
              }
            }
          }
        }
      }
    },
    '/api/project/{id}/chapters': {
      get: {
        tags: ['Markers'],
        summary: 'Get YouTube chapters',
        description: 'Returns markers formatted as YouTube chapter timestamps',
        operationId: 'getChapters',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          200: {
            description: 'YouTube chapters',
            content: {
              'text/plain': {
                schema: { type: 'string' },
                example: '0:00 Introduction\n0:30 Features\n1:30 Pricing'
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', description: 'Error message' },
          code: { type: 'string', description: 'Error code' },
          details: { type: 'object', description: 'Additional error details' }
        },
        required: ['error']
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded', 'error'] },
          version: { type: 'string' },
          services: {
            type: 'object',
            properties: {
              openai: { type: 'string', enum: ['connected', 'not-configured', 'error'] },
              groq: { type: 'string', enum: ['connected', 'not-configured', 'error'] },
              playwright: { type: 'string', enum: ['ready', 'error'] }
            }
          },
          uptime: { type: 'integer', description: 'Server uptime in seconds' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      StatsResponse: {
        type: 'object',
        properties: {
          uptime: { type: 'integer' },
          requests: { type: 'integer' },
          projectsCreated: { type: 'integer' },
          recordingsStarted: { type: 'integer' },
          exportsCompleted: { type: 'integer' },
          errors: { type: 'integer' },
          activeConnections: { type: 'integer' },
          activeLiveSessions: { type: 'integer' }
        }
      },
      ProjectSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: { type: 'string', format: 'uri' },
          name: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          hasVideo: { type: 'boolean' }
        }
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: { type: 'string', format: 'uri' },
          analysis: { $ref: '#/components/schemas/Analysis' },
          script: { type: 'string' },
          settings: { $ref: '#/components/schemas/ProjectSettings' },
          markers: {
            type: 'array',
            items: { $ref: '#/components/schemas/Marker' }
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Analysis: {
        type: 'object',
        properties: {
          productName: { type: 'string' },
          tagline: { type: 'string' },
          features: {
            type: 'array',
            items: { type: 'string' }
          },
          targetAudience: { type: 'string' },
          tone: { type: 'string' },
          keyElements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                element: { type: 'string' },
                importance: { type: 'string', enum: ['high', 'medium', 'low'] }
              }
            }
          }
        }
      },
      ProjectSettings: {
        type: 'object',
        properties: {
          width: { type: 'integer', default: 1920 },
          height: { type: 'integer', default: 1080 },
          fps: { type: 'integer', default: 60 },
          duration: { type: 'integer', default: 25 },
          style: { type: 'string', enum: ['professional', 'energetic', 'casual', 'minimal'] },
          voice: { type: 'string', enum: ['nova', 'alloy', 'echo', 'fable', 'onyx', 'shimmer'] }
        }
      },
      Marker: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          time: { type: 'number', description: 'Time in seconds' },
          label: { type: 'string' },
          type: { type: 'string', enum: ['chapter', 'zoom', 'highlight', 'cut', 'custom'] },
          metadata: { type: 'object' }
        },
        required: ['time', 'label', 'type']
      },
      AnalyzeRequest: {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri', description: 'Website URL to analyze' },
          duration: { type: 'integer', default: 25, description: 'Target demo duration in seconds' },
          style: { type: 'string', enum: ['professional', 'energetic', 'casual', 'minimal'], default: 'professional' }
        },
        required: ['url']
      },
      AnalyzeResponse: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          analysis: { $ref: '#/components/schemas/Analysis' },
          script: { type: 'string' },
          settings: { $ref: '#/components/schemas/ProjectSettings' }
        }
      },
      RecordRequest: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          url: { type: 'string', format: 'uri' },
          options: {
            type: 'object',
            properties: {
              width: { type: 'integer' },
              height: { type: 'integer' },
              duration: { type: 'integer' }
            }
          }
        }
      },
      RecordResponse: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          status: { type: 'string' },
          videoPath: { type: 'string' }
        }
      },
      ImportRequest: {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri' },
          type: { type: 'string', enum: ['auto', 'website', 'git'], default: 'auto' },
          options: {
            type: 'object',
            properties: {
              shallow: { type: 'boolean', default: true },
              branch: { type: 'string' },
              analyzeReadme: { type: 'boolean', default: true }
            }
          }
        },
        required: ['url']
      },
      ImportResponse: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['pending', 'processing', 'complete', 'error'] },
          importType: { type: 'string', enum: ['website', 'git'] },
          message: { type: 'string' }
        }
      },
      ImportStatus: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['pending', 'processing', 'complete', 'error'] },
          progress: { type: 'integer', minimum: 0, maximum: 100 },
          error: { type: 'string' },
          hasScript: { type: 'boolean' }
        }
      },
      LiveStartRequest: {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri' },
          projectId: { type: 'string', format: 'uuid' },
          options: {
            type: 'object',
            properties: {
              width: { type: 'integer', default: 1920 },
              height: { type: 'integer', default: 1080 },
              previewFps: { type: 'integer', default: 15 }
            }
          }
        },
        required: ['url']
      },
      LiveSessionResponse: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          projectId: { type: 'string', format: 'uuid' },
          status: { type: 'string' }
        }
      },
      LiveStopResponse: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          projectId: { type: 'string', format: 'uuid' },
          duration: { type: 'number' },
          videoPath: { type: 'string' }
        }
      },
      RenderRequest: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          preset: { type: 'string', enum: ['youtube', 'twitter', 'instagram', 'tiktok', 'linkedin', 'gif'] },
          options: {
            type: 'object',
            properties: {
              includeVoiceover: { type: 'boolean', default: true },
              includeZoom: { type: 'boolean', default: true },
              trimStart: { type: 'number' },
              trimEnd: { type: 'number' }
            }
          }
        },
        required: ['projectId']
      },
      RenderResponse: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          status: { type: 'string' },
          outputPath: { type: 'string' },
          downloadUrl: { type: 'string' }
        }
      }
    },
    responses: {
      BadRequest: {
        description: 'Invalid request parameters',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'URL is required' }
          }
        }
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Project not found' }
          }
        }
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'An unexpected error occurred' }
          }
        }
      }
    }
  }
};

/**
 * Generate Swagger UI HTML
 */
export function generateSwaggerHtml(specUrl = '/api/openapi.json') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LooK API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '${specUrl}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 2
      });
    };
  </script>
</body>
</html>`;
}

export default { openApiSpec, generateSwaggerHtml };
