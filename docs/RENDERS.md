# Room renders (restyle)

Img2img restyle of an owned room photo. Keeps architecture; changes furnishings
to match the DesignBrief when available.

## Flags

| Env                      | Default                            | Meaning                                             |
| ------------------------ | ---------------------------------- | --------------------------------------------------- |
| `CHAT_RENDERS_ENABLED`   | `0`                                | Master switch for render API + `create_render` tool |
| `IMAGE_RESTYLE_PROVIDER` | `disabled`                         | `disabled` \| `test` \| `http`                      |
| `IMAGE_RESTYLE_MODEL`    | _(empty → IMAGE_GENERATION_MODEL)_ | Restyle model id                                    |
| `RENDERS_DAILY_LIMIT`    | `10`                               | Per-user daily restyle cap                          |

HTTP restyle posts to `{IMAGE_GENERATION_API_URL}/restyle` with base64 source
image (raw `fetch`). CostLog kind `image`; caps via `checkCostAllowance`.

## Prompt pin

Every restyle prompt includes: _keep walls, windows, doors, geometry, and
camera identical; change only furnishings, materials, colors, decor._ When
`DESIGN_BRIEF_ENABLED=1` and a brief exists, style + palette + decided items
compose the rest of the prompt (brief is the single source of design intent).

## API

`POST /api/account/conversations/[conversationId]/renders`

```json
{ "uploadId": "...", "styleDirection": "optional extra note" }
```

Ownership: conversation + upload must belong to the session user.

## Structure check

After a successful restyle, a vision call (NANO-tier via `resolveModel("vision")`)
asks whether room structure matches. Telemetry only:
`render_structure_check` ops event (`sameStructure`, `confidence`) — never image
bytes or prompts.
