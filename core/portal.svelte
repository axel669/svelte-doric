<script context="module">
    let portalRoot = null
    const initPortal = (node) => portalRoot = node
    export const portal = (node) => {
        portalRoot.appendChild(node)
    }
</script>

<portal-root use:initPortal />
