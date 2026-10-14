@echo off
setlocal
set "NODEBIN=C:\Users\paras.sonawane\AppData\Local\OpenAI\Codex\runtimes\cua_node\a9ba6825a525118c\bin"
set "PATH=%NODEBIN%;%PATH%"
set NODE_TLS_REJECT_UNAUTHORIZED=0
cd /d "%~dp0"
"%NODEBIN%\corepack.cmd" pnpm dev --host