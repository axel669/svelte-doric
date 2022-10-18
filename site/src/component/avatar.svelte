<script>
    import {
        Avatar,
        TitleBar,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"
</script>

<TitleBar>
    Avatar
</TitleBar>

<div>
    <Avatar>SD</Avatar>
    <Avatar image="https://axel669.net/images/alia-icon.png" />
</div>

<Markdown {docs} />
