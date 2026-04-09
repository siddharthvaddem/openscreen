#!/usr/bin/env node

console.log(
	`Auto Screen MCP 연결 정보는 앱 실행 후 main process 로그에서 확인하세요.\n\nExpected log lines:\n[Auto Screen MCP] http://127.0.0.1:<port>/mcp\n[Auto Screen MCP Token] <token>\n\nThen configure your MCP client with:\n- URL: http://127.0.0.1:<port>/mcp\n- Authorization: Bearer <token>\n`,
);
