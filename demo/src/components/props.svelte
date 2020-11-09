<script>
    import {
        Card,
        CardContent,
        Text,
    } from "#lib"
    export let props

    ;$: propList = Object.keys(props)
        .sort()
        .map(
            name => ({
                name,
                ...props[name]
            })
        )
;</script>

<style>
    prop-entry {
        display: block;
        padding: 8px;
    }
    prop-entry:nth-child(2n + 1) {
        background-color: var(--background-highlight);
    }

    prop-name, prop-type, prop-description {
        display: block;
        padding: 8px;
    }
    prop-name {
        font-size: var(--text-header);
        font-weight: 700;
    }
    prop-type {
        font-style: italic;
    }
    prop-default:empty {
        display: none;
    }
    prop-default::before {
        content: ", default: ";
    }
    prop-description {
        display: block;
    }
</style>

<Card>
    {#each propList as prop}
        <prop-entry>
            <prop-name>
                {prop.name}
            </prop-name>
            <prop-type>
                {prop.type}
                <prop-default>{prop.defaultValue ?? ""}</prop-default>
            </prop-type>
            <prop-description>
                {prop.desc}
            </prop-description>
        </prop-entry>
    {/each}
</Card>
