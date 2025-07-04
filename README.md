# JSON Key Count

A Visual Studio Code extension that adds inline decorations to JSON files, showing the number of direct children for each object `{#}` or array `[#]`.

![Demo](./assets/demo.gif)

## Features
- Inline annotations that show `{#}` or `[#]` next to each JSON key
- Updates as you edit
- Toggle decorations on/off globally or per-workspace

## Settings
You can control whether decorations are enabled using either the command palette or settings:

Via Command Palette:
- Toggle JSON Key Count (User)
- Toggle JSON Key Count (Workspace)

Or in your settings.json:
```json
"jsonKeyDecorations.enabled": true
```

## Performance
This extension includes optimizations to avoid slowing down large JSON files:
- Decorations are throttled during typing
- Files over 10MB or 15,000 lines are skipped


## Installation
Search for JSON Key Count in the VSCode Extensions Marketplace or go here: [JSON Key Count](https://marketplace.visualstudio.com/items?itemName=nickcosmo.json-key-count)

## Contributing
Suggestions, issues, and pull requests are welcome! Open an issue or fork the project at: [json-key-count](https://github.com/nickcosmo/json-key-count)

## License
[MIT](./LICENSE)