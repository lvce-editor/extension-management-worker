# Extension Management Worker

Webworker for the Extension Management functionality in Lvce Editor.

## Remote workspace processes

Node RPC declarations run on the local application host by default. A declaration can opt into the workspace host with `"onRemote": "runOnRemote"`. In a remote workspace, extension management transfers its MessagePort to the isolated extension that declares `workspaceTransport: { scheme, command }` for that URI scheme. The transport command receives `(workspaceUri, type, port, params)`, where `params` contains the validated calling extension ID and declared RPC ID for `extension-node-process`. Terminals use `terminal-process` without extension IDs.

Transport commands are reserved for extension management and cannot be invoked as ordinary extension commands. The transport extension owns authentication, WebSockets, and connection disposal. Disabled or missing transports fail without launching a local replacement process. File workspaces retain local Node RPC connections.

Transports can additionally declare a `requestCommand` for `text-search`, `file-search`, and `terminal-options` requests. These receive the workspace URI, request type, and request arguments, and return the result through the extension RPC.
