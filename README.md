# Extension Management Worker

Webworker for the Extension Management functionality in Lvce Editor.

## Remote workspace processes

Node RPC declarations run on the local application host by default. A declaration can opt into the workspace host with `"onRemote": "runOnRemote"`. In a remote workspace, extension management transfers its MessagePort to the isolated extension that declares `workspaceTransport: { scheme, command }` for that URI scheme. The transport command receives `(workspaceUri, type, port, params)`, where `params` contains the validated calling extension ID and declared RPC ID for `extension-node-process`. Terminals use `terminal-process` without extension IDs.

Transport commands are reserved for extension management and cannot be invoked as ordinary extension commands. The transport extension owns authentication, WebSockets, and connection disposal. Disabled or missing transports fail without launching a local replacement process. File workspaces retain local Node RPC connections.

Transports can additionally declare a `requestCommand` for `text-search`, `file-search`, and `terminal-options` requests. These receive the workspace URI, request type, and request arguments, and return the result through the extension RPC.

## Extension query fields

`Extensions.getAllExtensions(assetDir, platform, fields?)` accepts an optional array of top-level field names, for example `['source-control-actions']`. Projection happens inside extension management before its RPC response is cloned. The same argument is supported through `Extensions.invokeForApplication(applicationId, 'Extensions.getAllExtensions', assetDir, platform, fields)`.

Omitting `fields` preserves the complete metadata response. An empty array returns an empty object for each extension. Missing fields are omitted; extension ordering and membership are unchanged. Fields such as `disabled` and `applicationId` reflect the resolved extension state when requested. Nested values are returned whole, and field names are literal rather than dotted paths. Projection does not change cached manifests or reduce the underlying shared-process catalog fetch.
