@echo off
setlocal
set "NODEBIN=C:\Users\paras.sonawane\AppData\Local\OpenAI\Codex\runtimes\cua_node\cfb32733c877621e\bin"
set "PATH=%NODEBIN%;%PATH%"
set NODE_TLS_REJECT_UNAUTHORIZED=0
cd /d "%~dp0finance-ui"
"%NODEBIN%\corepack.cmd" pnpm install