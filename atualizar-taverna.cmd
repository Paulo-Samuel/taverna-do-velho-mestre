@echo off
rem Atualiza a Taverna do Velho Mestre (duplo clique, com a taverna desligada). Toda a lógica está em atualizar-taverna.ps1.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0atualizar-taverna.ps1"
