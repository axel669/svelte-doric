var demo = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_custom_element_data(node, prop, value) {
        if (prop in node) {
            node[prop] = value;
        }
        else {
            attr(node, prop, value);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    // unfortunately this can't be a constant as that wouldn't be tree-shakeable
    // so we cache the result instead
    let crossorigin;
    function is_crossorigin() {
        if (crossorigin === undefined) {
            crossorigin = false;
            try {
                if (typeof window !== 'undefined' && window.parent) {
                    void window.parent.document;
                }
            }
            catch (error) {
                crossorigin = true;
            }
        }
        return crossorigin;
    }
    function add_resize_listener(node, fn) {
        const computed_style = getComputedStyle(node);
        const z_index = (parseInt(computed_style.zIndex) || 0) - 1;
        if (computed_style.position === 'static') {
            node.style.position = 'relative';
        }
        const iframe = element('iframe');
        iframe.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
            `overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: ${z_index};`);
        iframe.setAttribute('aria-hidden', 'true');
        iframe.tabIndex = -1;
        const crossorigin = is_crossorigin();
        let unsubscribe;
        if (crossorigin) {
            iframe.src = "data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>";
            unsubscribe = listen(window, 'message', (event) => {
                if (event.source === iframe.contentWindow)
                    fn();
            });
        }
        else {
            iframe.src = 'about:blank';
            iframe.onload = () => {
                unsubscribe = listen(iframe.contentWindow, 'resize', fn);
            };
        }
        append(node, iframe);
        return () => {
            if (crossorigin) {
                unsubscribe();
            }
            else if (unsubscribe && iframe.contentWindow) {
                unsubscribe();
            }
            detach(iframe);
        };
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(anchor = null) {
            this.a = anchor;
            this.e = this.n = null;
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.h(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    const calcValue = value => {
        if (Array.isArray(value) === false) {
            return value
        }
        if (value[0] === null || value[0] === undefined) {
            return null
        }
        return value.join("")
    };
    const udpateVars = (node, current, next) => {
        const keys = new Set([
            ...Object.keys(current),
            ...Object.keys(next),
        ]);
        for (const key of keys) {
            const varName = `--${key}`;
            const currentValue = calcValue(current[key]);
            const nextValue = calcValue(next[key]);
            if (nextValue === undefined || nextValue === null) {
                node.style.removeProperty(varName);
            }
            if (currentValue !== nextValue) {
                node.style.setProperty(varName, nextValue);
            }
        }
    };
    const vars = (node, vars) => {
        let currentVars = vars;
        udpateVars(node, {}, currentVars);
        return {
            update(newVars) {
                udpateVars(node, currentVars, newVars);
                currentVars = newVars;
            }
        }
    };

    const css = (parts, ...values) => {
        const css = parts
            .reduce(
                (cssParts, part, index) => [
                    ...cssParts,
                    part,
                    values[index] ?? ""
                ],
                []
            )
            .join("");
        return `<style>\n${css}\n</style>`
    };

    /* core\ripple.svelte generated by Svelte v3.29.4 */

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-acwzgw-style";
    	style.textContent = "ripple-wrapper.svelte-acwzgw{position:absolute;top:0px;left:0px;right:0px;bottom:0px;overflow:hidden}ripple.svelte-acwzgw{width:var(--size);height:var(--size);border-radius:50%;background-color:var(--ripple-color, var(--ripple-normal));position:absolute;left:var(--x);top:var(--y);transform:translate3d(-50%, -50%, 0);pointer-events:none;box-shadow:0px 0px 2px rgba(0, 0, 0, 0.25)}";
    	append(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (109:4) {#each ripples as info (info.id)}
    function create_each_block(key_1, ctx) {
    	let ripple;
    	let vars_action;
    	let ripple_intro;
    	let mounted;
    	let dispose;

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			ripple = element("ripple");
    			attr(ripple, "class", "svelte-acwzgw");
    			this.first = ripple;
    		},
    		m(target, anchor) {
    			insert(target, ripple, anchor);

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, ripple, /*rippleVars*/ ctx[5](/*info*/ ctx[10], /*color*/ ctx[0])));
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (vars_action && is_function(vars_action.update) && dirty & /*ripples, color*/ 3) vars_action.update.call(null, /*rippleVars*/ ctx[5](/*info*/ ctx[10], /*color*/ ctx[0]));
    		},
    		i(local) {
    			if (!ripple_intro) {
    				add_render_callback(() => {
    					ripple_intro = create_in_transition(ripple, customAnimation, {});
    					ripple_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(ripple);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment(ctx) {
    	let ripple_wrapper;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let ripple_wrapper_resize_listener;
    	let mounted;
    	let dispose;
    	let each_value = /*ripples*/ ctx[1];
    	const get_key = ctx => /*info*/ ctx[10].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	return {
    		c() {
    			ripple_wrapper = element("ripple-wrapper");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_custom_element_data(ripple_wrapper, "class", "svelte-acwzgw");
    			add_render_callback(() => /*ripple_wrapper_elementresize_handler*/ ctx[7].call(ripple_wrapper));
    		},
    		m(target, anchor) {
    			insert(target, ripple_wrapper, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ripple_wrapper, null);
    			}

    			ripple_wrapper_resize_listener = add_resize_listener(ripple_wrapper, /*ripple_wrapper_elementresize_handler*/ ctx[7].bind(ripple_wrapper));

    			if (!mounted) {
    				dispose = listen(ripple_wrapper, "pointer-start", /*addRipple*/ ctx[4]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*rippleVars, ripples, color*/ 35) {
    				const each_value = /*ripples*/ ctx[1];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ripple_wrapper, destroy_block, create_each_block, null, get_each_context);
    			}
    		},
    		i(local) {
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}
    		},
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(ripple_wrapper);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			ripple_wrapper_resize_listener();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    const calcOffset = touch => {
    	const { target, clientX, clientY } = touch;
    	const rect = target.getBoundingClientRect();
    	const x = clientX - rect.left;
    	const y = clientY - rect.top;
    	return { x, y };
    };

    const customAnimation = (node, options) => {
    	return {
    		delay: 0,
    		duration: 500,
    		css: (t, u) => `
                transform: translate3d(-50%, -50%, 0) scale(${1 - u ** 1.3});
                opacity: ${u ** 1.3};
            `
    	};
    };

    const duration = 500;

    function instance($$self, $$props, $$invalidate) {
    	let { color = null } = $$props;
    	let { disabled = false } = $$props;
    	let ripples = [];
    	let height = 0;
    	let width = 0;

    	const addRipple = evt => {
    		if (disabled === true) {
    			return;
    		}

    		for (const touch of evt.changedTouches) {
    			const { x, y } = calcOffset(touch);
    			const ripple = { id: Date.now(), x, y, size };
    			$$invalidate(1, ripples = [...ripples, ripple]);
    			setTimeout(() => $$invalidate(1, ripples = ripples.filter(r => r !== ripple)), duration);
    		}
    	};

    	const rippleVars = (info, color) => ({
    		"x": [info.x, "px"],
    		"y": [info.y, "px"],
    		"size": [info.size, "px"],
    		"ripple-color": color
    	});

    	function ripple_wrapper_elementresize_handler() {
    		height = this.offsetHeight;
    		width = this.offsetWidth;
    		$$invalidate(2, height);
    		$$invalidate(3, width);
    	}

    	$$self.$$set = $$props => {
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    		if ("disabled" in $$props) $$invalidate(6, disabled = $$props.disabled);
    	};

    	let size;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*width, height*/ 12) {
    			 size = Math.max(width, height) * 2;
    		}
    	};

    	return [
    		color,
    		ripples,
    		height,
    		width,
    		addRipple,
    		rippleVars,
    		disabled,
    		ripple_wrapper_elementresize_handler
    	];
    }

    class Ripple extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-acwzgw-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, { color: 0, disabled: 6 });
    	}
    }

    /* core\adornment.svelte generated by Svelte v3.29.4 */

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-wuqcg5-style";
    	style.textContent = "adornment.svelte-wuqcg5{display:inline-flex;justify-content:center;align-items:center;padding:4px}adornment.start.svelte-wuqcg5{grid-area:start-adornment}adornment.end.svelte-wuqcg5{grid-area:end-adornment}";
    	append(document.head, style);
    }

    function create_fragment$1(ctx) {
    	let adornment;
    	let adornment_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			adornment = element("adornment");
    			if (default_slot) default_slot.c();
    			attr(adornment, "class", adornment_class_value = "" + (null_to_empty(/*position*/ ctx[0]) + " svelte-wuqcg5"));
    		},
    		m(target, anchor) {
    			insert(target, adornment, anchor);

    			if (default_slot) {
    				default_slot.m(adornment, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*position*/ 1 && adornment_class_value !== (adornment_class_value = "" + (null_to_empty(/*position*/ ctx[0]) + " svelte-wuqcg5"))) {
    				attr(adornment, "class", adornment_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(adornment);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { position = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("position" in $$props) $$invalidate(0, position = $$props.position);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [position, $$scope, slots];
    }

    class Adornment extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-wuqcg5-style")) add_css$1();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { position: 0 });
    	}
    }

    const touchState = {};

    if (typeof window !== "undefined") {
        const pointerStart = "pointer-start";
        const pointerEnd = "pointer-end";
        const evtOptions = {bubbles: true};

        const isMobile = (window.ontouchstart !== undefined);
        const sourceEvents = isMobile
            ? {down: "touchstart", up: "touchend"}
            : {down: "mousedown", up: "mouseup"};

        console.log(isMobile, sourceEvents);

        window.addEventListener(
            sourceEvents.down,
            evt => {
                if (isMobile === false && evt.button !== 0) {
                    return
                }
                const customEvent = new CustomEvent(pointerStart, evtOptions);
                evt.identifier = evt.identifier ?? -1;
                customEvent.changedTouches = isMobile ? evt.changedTouches : [evt];
                evt.target.dispatchEvent(customEvent);
            },
            {capture: true}
        );
        window.addEventListener(
            sourceEvents.up,
            evt => {
                if (isMobile === false && evt.button !== 0) {
                    return
                }
                const customEvent = new CustomEvent(pointerEnd, evtOptions);
                evt.identifier = evt.identifier ?? -1;
                customEvent.changedTouches = isMobile ? evt.changedTouches : [evt];
                evt.target.dispatchEvent(customEvent);
            },
            {capture: true}
        );

        window.addEventListener(
            pointerStart,
            evt => {
                const timestamp = Date.now();
                for (const touch of evt.changedTouches) {
                    touchState[touch.identifier] = {
                        timestamp,
                        touch,
                    };
                }
            },
            {capture: true}
        );
        window.addEventListener(
            pointerEnd,
            evt => {
                const timestamp = Date.now();
                for (const touch of evt.changedTouches) {
                    const prev = touchState[touch.identifier];
                    touchState[touch.identifier] = null;

                    if (prev === null || prev === undefined) {
                        return
                    }

                    const duration = timestamp - prev.timestamp;
                    const dist = Math.sqrt(
                        (prev.touch.clientX - touch.clientX) ** 2
                        + (prev.touch.clientY - touch.clientY) ** 2
                    );
                    if (dist > 30 || duration > 500) {
                        return
                    }

                    const customEvent = new CustomEvent("tap", evtOptions);
                    customEvent.changedTouches = [touch];
                    touch.target.dispatchEvent(customEvent);
                }
            },
            {capture: true}
        );
    }

    /* core\app-style.svelte generated by Svelte v3.29.4 */

    function create_fragment$2(ctx) {
    	let switch_instance0;
    	let t;
    	let switch_instance1;
    	let switch_instance1_anchor;
    	let current;
    	var switch_value = /*theme*/ ctx[0];

    	function switch_props(ctx) {
    		return {};
    	}

    	if (switch_value) {
    		switch_instance0 = new switch_value(switch_props());
    	}

    	var switch_value_1 = /*baseline*/ ctx[1];

    	function switch_props_1(ctx) {
    		return {};
    	}

    	if (switch_value_1) {
    		switch_instance1 = new switch_value_1(switch_props_1());
    	}

    	return {
    		c() {
    			if (switch_instance0) create_component(switch_instance0.$$.fragment);
    			t = space();
    			if (switch_instance1) create_component(switch_instance1.$$.fragment);
    			switch_instance1_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance0) {
    				mount_component(switch_instance0, target, anchor);
    			}

    			insert(target, t, anchor);

    			if (switch_instance1) {
    				mount_component(switch_instance1, target, anchor);
    			}

    			insert(target, switch_instance1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (switch_value !== (switch_value = /*theme*/ ctx[0])) {
    				if (switch_instance0) {
    					group_outros();
    					const old_component = switch_instance0;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance0 = new switch_value(switch_props());
    					create_component(switch_instance0.$$.fragment);
    					transition_in(switch_instance0.$$.fragment, 1);
    					mount_component(switch_instance0, t.parentNode, t);
    				} else {
    					switch_instance0 = null;
    				}
    			}

    			if (switch_value_1 !== (switch_value_1 = /*baseline*/ ctx[1])) {
    				if (switch_instance1) {
    					group_outros();
    					const old_component = switch_instance1;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value_1) {
    					switch_instance1 = new switch_value_1(switch_props_1());
    					create_component(switch_instance1.$$.fragment);
    					transition_in(switch_instance1.$$.fragment, 1);
    					mount_component(switch_instance1, switch_instance1_anchor.parentNode, switch_instance1_anchor);
    				} else {
    					switch_instance1 = null;
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance0) transition_in(switch_instance0.$$.fragment, local);
    			if (switch_instance1) transition_in(switch_instance1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance0) transition_out(switch_instance0.$$.fragment, local);
    			if (switch_instance1) transition_out(switch_instance1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (switch_instance0) destroy_component(switch_instance0, detaching);
    			if (detaching) detach(t);
    			if (detaching) detach(switch_instance1_anchor);
    			if (switch_instance1) destroy_component(switch_instance1, detaching);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { theme = null } = $$props;
    	let { baseline = null } = $$props;

    	$$self.$$set = $$props => {
    		if ("theme" in $$props) $$invalidate(0, theme = $$props.theme);
    		if ("baseline" in $$props) $$invalidate(1, baseline = $$props.baseline);
    	};

    	return [theme, baseline];
    }

    class App_style extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { theme: 0, baseline: 1 });
    	}
    }

    /* core\baseline.svelte generated by Svelte v3.29.4 */

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-1d6x7v7-style";
    	style.textContent = "html{margin:0px;padding:0px;width:100%;height:100%}body{margin:0px;padding:0px;width:100%;min-height:100%;-webkit-tap-highlight-color:transparent;font-family:var(--font);background-color:var(--background);color:var(--text-normal);font-size:var(--text-size);--button-default-fill:#aaaaaa;--button-default-text:var(--text-dark);--button-primary:var(--primary);--button-primary-text:var(--text-dark);--button-primary-ripple:var(--primary-ripple);--button-secondary:var(--secondary);--button-secondary-text:var(--text-dark);--button-secondary-ripple:var(--secondary-ripple);--button-danger:var(--danger);--button-danger-text:var(--text-dark);--button-danger-ripple:var(--danger-ripple);--button-filled-ripple:var(--ripple-invert);--card-background:var(--background-layer);--card-border:var(--layer-border-width) solid var(--text-normal);--control-border:var(--text-secondary);--control-border-focus:var(--primary);--control-border-error:var(--danger);--title-bar-background:var(--primary);--title-bar-text:var(--text-invert)}";
    	append(document.head, style);
    }

    function create_fragment$3(ctx) {
    	let link0;
    	let link1;
    	let link2;

    	return {
    		c() {
    			link0 = element("link");
    			link1 = element("link");
    			link2 = element("link");
    			attr(link0, "href", "https://fonts.googleapis.com/css?family=Roboto:300,400,500,700");
    			attr(link0, "rel", "stylesheet");
    			attr(link0, "type", "text/css");
    			attr(link1, "href", "https://fonts.googleapis.com/css?family=Inconsolata:300,400,500,700");
    			attr(link1, "rel", "stylesheet");
    			attr(link1, "type", "text/css");
    			attr(link2, "href", "https://fonts.googleapis.com/icon?family=Material+Icons|Material+Icons+Outlined");
    			attr(link2, "rel", "stylesheet");
    		},
    		m(target, anchor) {
    			append(document.head, link0);
    			append(document.head, link1);
    			append(document.head, link2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			detach(link0);
    			detach(link1);
    			detach(link2);
    		}
    	};
    }

    class Baseline extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1d6x7v7-style")) add_css$2();
    		init(this, options, null, create_fragment$3, safe_not_equal, {});
    	}
    }

    /* core\button.svelte generated by Svelte v3.29.4 */

    function add_css$3() {
    	var style = element("style");
    	style.id = "svelte-k4pik7-style";
    	style.textContent = "doric-button.svelte-k4pik7{position:relative;padding:8px 16px;border-radius:4px;user-select:none;cursor:pointer;overflow:hidden;box-sizing:border-box;vertical-align:middle;display:inline-flex;justify-content:center;align-items:center;z-index:+1;font-weight:500;--button-color:var(--text-normal);--fill-color:var(--button-default-fill);--text-color:var(--button-default-text);color:var(--button-color)}.round.svelte-k4pik7{min-width:var(--button-round-size);height:var(--button-round-size);padding:8px;border-radius:var(--button-round-size)}.fab.svelte-k4pik7{width:var(--button-round-size);padding:0px}.disabled.svelte-k4pik7{filter:contrast(50%)}.primary.svelte-k4pik7{--button-color:var(--button-primary);--fill-color:var(--button-primary);--ripple-color:var(--button-primary-ripple);--text-color:var(--button-primary-text)}.secondary.svelte-k4pik7{--button-color:var(--button-secondary);--fill-color:var(--button-secondary);--ripple-color:var(--button-secondary-ripple);--text-color:var(--button-secondary-text)}.danger.svelte-k4pik7{--button-color:var(--button-danger);--fill-color:var(--button-danger);--ripple-color:var(--button-danger-ripple);--text-color:var(--button-danger-text)}.fill.svelte-k4pik7{--ripple-color:var(--button-filled-ripple);background-color:var(--fill-color);color:var(--text-color)}.outline.svelte-k4pik7{border:1px solid var(--button-color);color:var(--button-color)}";
    	append(document.head, style);
    }

    function create_fragment$4(ctx) {
    	let doric_button;
    	let t;
    	let ripple;
    	let doric_button_class_value;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);
    	ripple = new Ripple({ props: { disabled: /*disabled*/ ctx[2] } });

    	return {
    		c() {
    			doric_button = element("doric-button");
    			if (default_slot) default_slot.c();
    			t = space();
    			create_component(ripple.$$.fragment);
    			set_custom_element_data(doric_button, "class", doric_button_class_value = "" + (/*color*/ ctx[0] + " " + /*variant*/ ctx[1] + " " + /*klass*/ ctx[5] + " svelte-k4pik7"));
    			toggle_class(doric_button, "disabled", /*disabled*/ ctx[2]);
    			toggle_class(doric_button, "round", /*round*/ ctx[3]);
    			toggle_class(doric_button, "fab", /*fab*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, doric_button, anchor);

    			if (default_slot) {
    				default_slot.m(doric_button, null);
    			}

    			append(doric_button, t);
    			mount_component(ripple, doric_button, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(doric_button, "click", /*handleTap*/ ctx[7]),
    					action_destroyer(vars_action = vars.call(null, doric_button, /*buttonVars*/ ctx[6]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 256) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], dirty, null, null);
    				}
    			}

    			const ripple_changes = {};
    			if (dirty & /*disabled*/ 4) ripple_changes.disabled = /*disabled*/ ctx[2];
    			ripple.$set(ripple_changes);

    			if (!current || dirty & /*color, variant, klass*/ 35 && doric_button_class_value !== (doric_button_class_value = "" + (/*color*/ ctx[0] + " " + /*variant*/ ctx[1] + " " + /*klass*/ ctx[5] + " svelte-k4pik7"))) {
    				set_custom_element_data(doric_button, "class", doric_button_class_value);
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*buttonVars*/ 64) vars_action.update.call(null, /*buttonVars*/ ctx[6]);

    			if (dirty & /*color, variant, klass, disabled*/ 39) {
    				toggle_class(doric_button, "disabled", /*disabled*/ ctx[2]);
    			}

    			if (dirty & /*color, variant, klass, round*/ 43) {
    				toggle_class(doric_button, "round", /*round*/ ctx[3]);
    			}

    			if (dirty & /*color, variant, klass, fab*/ 51) {
    				toggle_class(doric_button, "fab", /*fab*/ ctx[4]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(ripple.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(ripple.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_button);
    			if (default_slot) default_slot.d(detaching);
    			destroy_component(ripple);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { color = "default" } = $$props;
    	let { variant = "normal" } = $$props;
    	let { disabled = false } = $$props;
    	let { round } = $$props;
    	let { fab } = $$props;
    	let { class: klass = "" } = $$props;
    	const dispatch = createEventDispatcher();

    	const handleTap = evt => {
    		if (disabled === true) {
    			return;
    		}

    		dispatch("tap", evt);
    	};

    	$$self.$$set = $$props => {
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    		if ("variant" in $$props) $$invalidate(1, variant = $$props.variant);
    		if ("disabled" in $$props) $$invalidate(2, disabled = $$props.disabled);
    		if ("round" in $$props) $$invalidate(3, round = $$props.round);
    		if ("fab" in $$props) $$invalidate(4, fab = $$props.fab);
    		if ("class" in $$props) $$invalidate(5, klass = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	let buttonVars;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*round*/ 8) {
    			 $$invalidate(6, buttonVars = { "button-round-size": round });
    		}
    	};

    	return [
    		color,
    		variant,
    		disabled,
    		round,
    		fab,
    		klass,
    		buttonVars,
    		handleTap,
    		$$scope,
    		slots
    	];
    }

    class Button extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-k4pik7-style")) add_css$3();

    		init(this, options, instance$3, create_fragment$4, safe_not_equal, {
    			color: 0,
    			variant: 1,
    			disabled: 2,
    			round: 3,
    			fab: 4,
    			class: 5
    		});
    	}
    }

    /* core\card.svelte generated by Svelte v3.29.4 */

    function add_css$4() {
    	var style = element("style");
    	style.id = "svelte-vsd2be-style";
    	style.textContent = "doric-card.svelte-vsd2be{display:grid;border-radius:4px;margin:4px;background-color:var(--card-background);border:var(--card-border);box-shadow:0px 2px 4px rgba(0, 0, 0, 0.25);overflow:hidden}doric-card.svelte-vsd2be>card-content{display:block;padding:16px}doric-card.svelte-vsd2be>card-actions{display:block;padding:8px}";
    	append(document.head, style);
    }

    function create_fragment$5(ctx) {
    	let doric_card;
    	let doric_card_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			doric_card = element("doric-card");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(doric_card, "class", doric_card_class_value = "" + (null_to_empty(/*klass*/ ctx[0]) + " svelte-vsd2be"));
    		},
    		m(target, anchor) {
    			insert(target, doric_card, anchor);

    			if (default_slot) {
    				default_slot.m(doric_card, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*klass*/ 1 && doric_card_class_value !== (doric_card_class_value = "" + (null_to_empty(/*klass*/ ctx[0]) + " svelte-vsd2be"))) {
    				set_custom_element_data(doric_card, "class", doric_card_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_card);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { class: klass = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("class" in $$props) $$invalidate(0, klass = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [klass, $$scope, slots];
    }

    class Card extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-vsd2be-style")) add_css$4();
    		init(this, options, instance$4, create_fragment$5, safe_not_equal, { class: 0 });
    	}
    }

    /* core\toggle\base.svelte generated by Svelte v3.29.4 */

    function add_css$5() {
    	var style = element("style");
    	style.id = "svelte-tgukdh-style";
    	style.textContent = "toggle-wrapper.svelte-tgukdh.svelte-tgukdh{position:relative;display:inline-grid;border-radius:4px;overflow:hidden;column-gap:4px;user-select:none}toggle-wrapper.svelte-tgukdh .svelte-tgukdh:first-child{grid-area:symbol;align-self:center;justify-self:center}toggle-wrapper.svelte-tgukdh>.svelte-tgukdh:nth-child(2){grid-area:label}.disabled.svelte-tgukdh.svelte-tgukdh{filter:contrast(50%);cursor:default}.right.svelte-tgukdh.svelte-tgukdh{grid-template-columns:min-content auto;grid-template-areas:\"symbol label\"\r\n        }.left.svelte-tgukdh.svelte-tgukdh{grid-template-columns:auto min-content;grid-template-areas:\"label symbol\"\r\n        }.top.svelte-tgukdh.svelte-tgukdh{grid-template-rows:auto min-content;grid-template-areas:\"label\"\r\n            \"symbol\"\r\n        }.bottom.svelte-tgukdh.svelte-tgukdh{grid-template-rows:min-content auto;grid-template-areas:\"symbol\"\r\n            \"label\"\r\n        }toggle-wrapper.top.svelte-tgukdh>.svelte-tgukdh,toggle-wrapper.bottom.svelte-tgukdh>.svelte-tgukdh{justify-content:center}toggle-label.svelte-tgukdh.svelte-tgukdh{display:grid;align-items:center}.labelToggle.svelte-tgukdh.svelte-tgukdh{cursor:pointer}";
    	append(document.head, style);
    }

    const get_label_slot_changes = dirty => ({});
    const get_label_slot_context = ctx => ({});

    function create_fragment$6(ctx) {
    	let toggle_wrapper;
    	let t;
    	let toggle_label;
    	let toggle_wrapper_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], null);
    	const label_slot_template = /*#slots*/ ctx[10].label;
    	const label_slot = create_slot(label_slot_template, ctx, /*$$scope*/ ctx[9], get_label_slot_context);

    	return {
    		c() {
    			toggle_wrapper = element("toggle-wrapper");
    			if (default_slot) default_slot.c();
    			t = space();
    			toggle_label = element("toggle-label");
    			if (label_slot) label_slot.c();
    			set_custom_element_data(toggle_label, "class", "svelte-tgukdh");
    			toggle_class(toggle_label, "labelToggle", /*labelToggle*/ ctx[1]);
    			set_custom_element_data(toggle_wrapper, "class", toggle_wrapper_class_value = "" + (/*labelPlacement*/ ctx[2] + " " + /*klass*/ ctx[3] + " svelte-tgukdh"));
    			toggle_class(toggle_wrapper, "disabled", /*disabled*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, toggle_wrapper, anchor);

    			if (default_slot) {
    				default_slot.m(toggle_wrapper, null);
    			}

    			append(toggle_wrapper, t);
    			append(toggle_wrapper, toggle_label);

    			if (label_slot) {
    				label_slot.m(toggle_label, null);
    			}

    			/*toggle_label_binding*/ ctx[11](toggle_label);
    			current = true;

    			if (!mounted) {
    				dispose = listen(toggle_wrapper, "tap", /*boxTap*/ ctx[5]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 512) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[9], dirty, null, null);
    				}
    			}

    			if (label_slot) {
    				if (label_slot.p && dirty & /*$$scope*/ 512) {
    					update_slot(label_slot, label_slot_template, ctx, /*$$scope*/ ctx[9], dirty, get_label_slot_changes, get_label_slot_context);
    				}
    			}

    			if (dirty & /*labelToggle*/ 2) {
    				toggle_class(toggle_label, "labelToggle", /*labelToggle*/ ctx[1]);
    			}

    			if (!current || dirty & /*labelPlacement, klass*/ 12 && toggle_wrapper_class_value !== (toggle_wrapper_class_value = "" + (/*labelPlacement*/ ctx[2] + " " + /*klass*/ ctx[3] + " svelte-tgukdh"))) {
    				set_custom_element_data(toggle_wrapper, "class", toggle_wrapper_class_value);
    			}

    			if (dirty & /*labelPlacement, klass, disabled*/ 13) {
    				toggle_class(toggle_wrapper, "disabled", /*disabled*/ ctx[0]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(label_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(label_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(toggle_wrapper);
    			if (default_slot) default_slot.d(detaching);
    			if (label_slot) label_slot.d(detaching);
    			/*toggle_label_binding*/ ctx[11](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { checked = false } = $$props;
    	let { toggle } = $$props;
    	let { disabled } = $$props;
    	let { color = "default" } = $$props;
    	let { labelToggle = true } = $$props;
    	let { labelPlacement = "right" } = $$props;
    	let { class: klass = "" } = $$props;
    	let labelElement;

    	const boxTap = evt => {
    		if (disabled === true) {
    			return;
    		}

    		if (labelToggle === false && labelElement.contains(evt.target)) {
    			return;
    		}

    		toggle();
    	};

    	function toggle_label_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			labelElement = $$value;
    			$$invalidate(4, labelElement);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("checked" in $$props) $$invalidate(6, checked = $$props.checked);
    		if ("toggle" in $$props) $$invalidate(7, toggle = $$props.toggle);
    		if ("disabled" in $$props) $$invalidate(0, disabled = $$props.disabled);
    		if ("color" in $$props) $$invalidate(8, color = $$props.color);
    		if ("labelToggle" in $$props) $$invalidate(1, labelToggle = $$props.labelToggle);
    		if ("labelPlacement" in $$props) $$invalidate(2, labelPlacement = $$props.labelPlacement);
    		if ("class" in $$props) $$invalidate(3, klass = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(9, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*checked, color*/ 320) ;
    	};

    	return [
    		disabled,
    		labelToggle,
    		labelPlacement,
    		klass,
    		labelElement,
    		boxTap,
    		checked,
    		toggle,
    		color,
    		$$scope,
    		slots,
    		toggle_label_binding
    	];
    }

    class Base extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-tgukdh-style")) add_css$5();

    		init(this, options, instance$5, create_fragment$6, safe_not_equal, {
    			checked: 6,
    			toggle: 7,
    			disabled: 0,
    			color: 8,
    			labelToggle: 1,
    			labelPlacement: 2,
    			class: 3
    		});
    	}
    }

    /* core\icon.svelte generated by Svelte v3.29.4 */

    function add_css$6() {
    	var style = element("style");
    	style.id = "svelte-ckwsqd-style";
    	style.textContent = "doric-icon.svelte-ckwsqd{margin:0px 4px}";
    	append(document.head, style);
    }

    function create_fragment$7(ctx) {
    	let doric_icon;
    	let t;
    	let doric_icon_class_value;
    	let vars_action;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			doric_icon = element("doric-icon");
    			t = text(/*name*/ ctx[0]);
    			set_custom_element_data(doric_icon, "class", doric_icon_class_value = "" + (null_to_empty(/*klass*/ ctx[2]) + " svelte-ckwsqd"));
    			toggle_class(doric_icon, "material-icons", !/*outlined*/ ctx[1]);
    			toggle_class(doric_icon, "material-icons-outlined", /*outlined*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, doric_icon, anchor);
    			append(doric_icon, t);

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, doric_icon, /*iconVars*/ ctx[3]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*name*/ 1) set_data(t, /*name*/ ctx[0]);

    			if (dirty & /*klass*/ 4 && doric_icon_class_value !== (doric_icon_class_value = "" + (null_to_empty(/*klass*/ ctx[2]) + " svelte-ckwsqd"))) {
    				set_custom_element_data(doric_icon, "class", doric_icon_class_value);
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*iconVars*/ 8) vars_action.update.call(null, /*iconVars*/ ctx[3]);

    			if (dirty & /*klass, outlined*/ 6) {
    				toggle_class(doric_icon, "material-icons", !/*outlined*/ ctx[1]);
    			}

    			if (dirty & /*klass, outlined*/ 6) {
    				toggle_class(doric_icon, "material-icons-outlined", /*outlined*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(doric_icon);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { name } = $$props;
    	let { outlined = false } = $$props;
    	let { size } = $$props;
    	let { class: klass } = $$props;

    	$$self.$$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("outlined" in $$props) $$invalidate(1, outlined = $$props.outlined);
    		if ("size" in $$props) $$invalidate(4, size = $$props.size);
    		if ("class" in $$props) $$invalidate(2, klass = $$props.class);
    	};

    	let iconVars;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*size*/ 16) {
    			 $$invalidate(3, iconVars = { "icon-font-size": size });
    		}
    	};

    	return [name, outlined, klass, iconVars, size];
    }

    class Icon extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-ckwsqd-style")) add_css$6();
    		init(this, options, instance$6, create_fragment$7, safe_not_equal, { name: 0, outlined: 1, size: 4, class: 2 });
    	}
    }

    /* core\checkbox.svelte generated by Svelte v3.29.4 */

    function add_css$7() {
    	var style = element("style");
    	style.id = "svelte-gvpcp9-style";
    	style.textContent = "checkbox-label.svelte-gvpcp9{display:flex;align-items:center}checkbox-check.svelte-gvpcp9{grid-area:symbol;align-self:center;justify-self:center}";
    	append(document.head, style);
    }

    // (51:8) <Button round="40px" color={buttonColor} {disabled} fab>
    function create_default_slot_1(ctx) {
    	let icon_1;
    	let current;

    	icon_1 = new Icon({
    			props: {
    				name: /*icon*/ ctx[6],
    				size: "22px",
    				outlined: /*outlined*/ ctx[5]
    			}
    		});

    	return {
    		c() {
    			create_component(icon_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon_1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const icon_1_changes = {};
    			if (dirty & /*icon*/ 64) icon_1_changes.name = /*icon*/ ctx[6];
    			if (dirty & /*outlined*/ 32) icon_1_changes.outlined = /*outlined*/ ctx[5];
    			icon_1.$set(icon_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(icon_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon_1, detaching);
    		}
    	};
    }

    // (55:4) <checkbox-label slot="label">
    function create_label_slot(ctx) {
    	let checkbox_label;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[13].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[14], null);

    	return {
    		c() {
    			checkbox_label = element("checkbox-label");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(checkbox_label, "slot", "label");
    			set_custom_element_data(checkbox_label, "class", "svelte-gvpcp9");
    		},
    		m(target, anchor) {
    			insert(target, checkbox_label, anchor);

    			if (default_slot) {
    				default_slot.m(checkbox_label, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 16384) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[14], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(checkbox_label);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (49:0) <ToggleBase {checked} {disabled} {toggle} {color} {labelPlacement} {labelToggle}>
    function create_default_slot(ctx) {
    	let checkbox_check;
    	let button;
    	let t;
    	let current;

    	button = new Button({
    			props: {
    				round: "40px",
    				color: /*buttonColor*/ ctx[7],
    				disabled: /*disabled*/ ctx[1],
    				fab: true,
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			checkbox_check = element("checkbox-check");
    			create_component(button.$$.fragment);
    			t = space();
    			set_custom_element_data(checkbox_check, "class", "svelte-gvpcp9");
    		},
    		m(target, anchor) {
    			insert(target, checkbox_check, anchor);
    			mount_component(button, checkbox_check, null);
    			insert(target, t, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};
    			if (dirty & /*buttonColor*/ 128) button_changes.color = /*buttonColor*/ ctx[7];
    			if (dirty & /*disabled*/ 2) button_changes.disabled = /*disabled*/ ctx[1];

    			if (dirty & /*$$scope, icon, outlined*/ 16480) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(checkbox_check);
    			destroy_component(button);
    			if (detaching) detach(t);
    		}
    	};
    }

    function create_fragment$8(ctx) {
    	let togglebase;
    	let current;

    	togglebase = new Base({
    			props: {
    				checked: /*checked*/ ctx[0],
    				disabled: /*disabled*/ ctx[1],
    				toggle: /*toggle*/ ctx[8],
    				color: /*color*/ ctx[2],
    				labelPlacement: /*labelPlacement*/ ctx[3],
    				labelToggle: /*labelToggle*/ ctx[4],
    				$$slots: {
    					default: [create_default_slot],
    					label: [create_label_slot]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(togglebase.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(togglebase, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const togglebase_changes = {};
    			if (dirty & /*checked*/ 1) togglebase_changes.checked = /*checked*/ ctx[0];
    			if (dirty & /*disabled*/ 2) togglebase_changes.disabled = /*disabled*/ ctx[1];
    			if (dirty & /*color*/ 4) togglebase_changes.color = /*color*/ ctx[2];
    			if (dirty & /*labelPlacement*/ 8) togglebase_changes.labelPlacement = /*labelPlacement*/ ctx[3];
    			if (dirty & /*labelToggle*/ 16) togglebase_changes.labelToggle = /*labelToggle*/ ctx[4];

    			if (dirty & /*$$scope, buttonColor, disabled, icon, outlined*/ 16610) {
    				togglebase_changes.$$scope = { dirty, ctx };
    			}

    			togglebase.$set(togglebase_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(togglebase.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(togglebase.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(togglebase, detaching);
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { group = [] } = $$props;
    	let { value } = $$props;
    	let { checked = group.indexOf(value) !== -1 } = $$props;
    	let { disabled } = $$props;
    	let { color = "default" } = $$props;
    	let { labelPlacement } = $$props;
    	let { labelToggle = true } = $$props;
    	let { checkedIcon = "check_box" } = $$props;
    	let { uncheckedIcon = "check_box_outline_blank" } = $$props;
    	let { outlined } = $$props;
    	const toggle = () => $$invalidate(0, checked = !checked);

    	const updateGroup = checked => {
    		if (checked === false) {
    			if (group.indexOf(value) !== -1) {
    				$$invalidate(9, group = group.filter(v => v !== value));
    			}

    			return;
    		}

    		if (group.indexOf(value) === -1) {
    			$$invalidate(9, group = [...group, value].sort());
    		}
    	};

    	$$self.$$set = $$props => {
    		if ("group" in $$props) $$invalidate(9, group = $$props.group);
    		if ("value" in $$props) $$invalidate(10, value = $$props.value);
    		if ("checked" in $$props) $$invalidate(0, checked = $$props.checked);
    		if ("disabled" in $$props) $$invalidate(1, disabled = $$props.disabled);
    		if ("color" in $$props) $$invalidate(2, color = $$props.color);
    		if ("labelPlacement" in $$props) $$invalidate(3, labelPlacement = $$props.labelPlacement);
    		if ("labelToggle" in $$props) $$invalidate(4, labelToggle = $$props.labelToggle);
    		if ("checkedIcon" in $$props) $$invalidate(11, checkedIcon = $$props.checkedIcon);
    		if ("uncheckedIcon" in $$props) $$invalidate(12, uncheckedIcon = $$props.uncheckedIcon);
    		if ("outlined" in $$props) $$invalidate(5, outlined = $$props.outlined);
    		if ("$$scope" in $$props) $$invalidate(14, $$scope = $$props.$$scope);
    	};

    	let icon;
    	let buttonColor;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*checked, checkedIcon, uncheckedIcon*/ 6145) {
    			 $$invalidate(6, icon = checked ? checkedIcon : uncheckedIcon);
    		}

    		if ($$self.$$.dirty & /*checked, color*/ 5) {
    			 $$invalidate(7, buttonColor = checked ? color : "default");
    		}

    		if ($$self.$$.dirty & /*checked*/ 1) {
    			 updateGroup(checked);
    		}
    	};

    	return [
    		checked,
    		disabled,
    		color,
    		labelPlacement,
    		labelToggle,
    		outlined,
    		icon,
    		buttonColor,
    		toggle,
    		group,
    		value,
    		checkedIcon,
    		uncheckedIcon,
    		slots,
    		$$scope
    	];
    }

    class Checkbox extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-gvpcp9-style")) add_css$7();

    		init(this, options, instance$7, create_fragment$8, safe_not_equal, {
    			group: 9,
    			value: 10,
    			checked: 0,
    			disabled: 1,
    			color: 2,
    			labelPlacement: 3,
    			labelToggle: 4,
    			checkedIcon: 11,
    			uncheckedIcon: 12,
    			outlined: 5
    		});
    	}
    }

    /* core\chip.svelte generated by Svelte v3.29.4 */

    function add_css$8() {
    	var style = element("style");
    	style.id = "svelte-c8trs3-style";
    	style.textContent = "chip.svelte-c8trs3{position:relative;overflow:hidden;vertical-align:text-bottom;display:inline-grid;grid-template-columns:minmax(12px, min-content) auto minmax(12px, min-content)\r\n        ;grid-template-areas:\"start-adornment content end-adornment\"\r\n        ;border-radius:16px;height:30px;user-select:none;margin:2px;--fill-color:var(--button-default-fill);--text-color:var(--text-invert);background-color:var(--fill-color);color:var(--text-color);font-weight:500;font-size:var(--text-size-info)}chip.clickable.svelte-c8trs3{cursor:pointer}chip.primary.svelte-c8trs3{--fill-color:var(--primary)}chip.secondary.svelte-c8trs3{--fill-color:var(--secondary)}chip.danger.svelte-c8trs3{--fill-color:var(--danger)}div.svelte-c8trs3{grid-area:content;display:flex;align-items:center}";
    	append(document.head, style);
    }

    // (56:4) {#if clickable}
    function create_if_block(ctx) {
    	let ripple;
    	let current;
    	ripple = new Ripple({});

    	return {
    		c() {
    			create_component(ripple.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(ripple, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(ripple.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(ripple.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(ripple, detaching);
    		}
    	};
    }

    function create_fragment$9(ctx) {
    	let chip;
    	let t0;
    	let t1;
    	let div;
    	let t2;
    	let chip_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*clickable*/ ctx[2] && create_if_block();
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	return {
    		c() {
    			chip = element("chip");
    			if (if_block) if_block.c();
    			t0 = space();
    			if (default_slot) default_slot.c();
    			t1 = space();
    			div = element("div");
    			t2 = text(/*label*/ ctx[0]);
    			attr(div, "class", "svelte-c8trs3");
    			attr(chip, "class", chip_class_value = "" + (null_to_empty(/*color*/ ctx[1]) + " svelte-c8trs3"));
    			toggle_class(chip, "clickable", /*clickable*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, chip, anchor);
    			if (if_block) if_block.m(chip, null);
    			append(chip, t0);

    			if (default_slot) {
    				default_slot.m(chip, null);
    			}

    			append(chip, t1);
    			append(chip, div);
    			append(div, t2);
    			current = true;

    			if (!mounted) {
    				dispose = listen(chip, "tap", /*tap_handler*/ ctx[5]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (/*clickable*/ ctx[2]) {
    				if (if_block) {
    					if (dirty & /*clickable*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block();
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(chip, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 8) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*label*/ 1) set_data(t2, /*label*/ ctx[0]);

    			if (!current || dirty & /*color*/ 2 && chip_class_value !== (chip_class_value = "" + (null_to_empty(/*color*/ ctx[1]) + " svelte-c8trs3"))) {
    				attr(chip, "class", chip_class_value);
    			}

    			if (dirty & /*color, clickable*/ 6) {
    				toggle_class(chip, "clickable", /*clickable*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(chip);
    			if (if_block) if_block.d();
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { label } = $$props;
    	let { color } = $$props;
    	let { clickable } = $$props;

    	function tap_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("label" in $$props) $$invalidate(0, label = $$props.label);
    		if ("color" in $$props) $$invalidate(1, color = $$props.color);
    		if ("clickable" in $$props) $$invalidate(2, clickable = $$props.clickable);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	return [label, color, clickable, $$scope, slots, tap_handler];
    }

    class Chip extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-c8trs3-style")) add_css$8();
    		init(this, options, instance$8, create_fragment$9, safe_not_equal, { label: 0, color: 1, clickable: 2 });
    	}
    }

    /* core\portal.svelte generated by Svelte v3.29.4 */

    function create_fragment$a(ctx) {
    	let portal_element;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			portal_element = element("portal-element");
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			insert(target, portal_element, anchor);

    			if (default_slot) {
    				default_slot.m(portal_element, null);
    			}

    			/*portal_element_binding*/ ctx[3](portal_element);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(portal_element);
    			if (default_slot) default_slot.d(detaching);
    			/*portal_element_binding*/ ctx[3](null);
    		}
    	};
    }

    const portalRoot = document.createElement("portal-root");

    if (typeof document !== "undefined") {
    	document.body.appendChild(portalRoot);
    }



    function instance_1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let instance;

    	onMount(() => {
    		portalRoot.appendChild(instance);
    	});

    	function portal_element_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			instance = $$value;
    			$$invalidate(0, instance);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	return [instance, $$scope, slots, portal_element_binding];
    }

    class Portal extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance_1, create_fragment$a, safe_not_equal, {});
    	}
    }

    /* core\modal.svelte generated by Svelte v3.29.4 */

    function add_css$9() {
    	var style = element("style");
    	style.id = "svelte-134cs7e-style";
    	style.textContent = "modal-wrapper.svelte-134cs7e{position:fixed;top:0px;left:0px;width:100vw;height:100vh;background-color:rgba(0, 0, 0, 0.35);z-index:+100}";
    	append(document.head, style);
    }

    // (29:4) {#if open}
    function create_if_block$1(ctx) {
    	let modal_wrapper;
    	let div;
    	let modal_wrapper_transition;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			modal_wrapper = element("modal-wrapper");
    			div = element("div");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(modal_wrapper, "class", "svelte-134cs7e");
    		},
    		m(target, anchor) {
    			insert(target, modal_wrapper, anchor);
    			append(modal_wrapper, div);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(div, "click", stop_propagation(/*click_handler*/ ctx[3])),
    					listen(modal_wrapper, "click", /*wat*/ ctx[1])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 16) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			add_render_callback(() => {
    				if (!modal_wrapper_transition) modal_wrapper_transition = create_bidirectional_transition(modal_wrapper, fade, { duration: 250 }, true);
    				modal_wrapper_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			if (!modal_wrapper_transition) modal_wrapper_transition = create_bidirectional_transition(modal_wrapper, fade, { duration: 250 }, false);
    			modal_wrapper_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(modal_wrapper);
    			if (default_slot) default_slot.d(detaching);
    			if (detaching && modal_wrapper_transition) modal_wrapper_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (28:0) <Portal>
    function create_default_slot$1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*open*/ ctx[0] && create_if_block$1(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*open*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*open*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$b(ctx) {
    	let portal;
    	let current;

    	portal = new Portal({
    			props: {
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(portal.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(portal, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const portal_changes = {};

    			if (dirty & /*$$scope, open*/ 17) {
    				portal_changes.$$scope = { dirty, ctx };
    			}

    			portal.$set(portal_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(portal.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(portal.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(portal, detaching);
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { open = false } = $$props;
    	const dispatch = createEventDispatcher();

    	const wat = evt => {
    		dispatch("close");
    	};

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("open" in $$props) $$invalidate(0, open = $$props.open);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	return [open, wat, slots, click_handler, $$scope];
    }

    class Modal extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-134cs7e-style")) add_css$9();
    		init(this, options, instance$9, create_fragment$b, safe_not_equal, { open: 0 });
    	}
    }

    /* core\text.svelte generated by Svelte v3.29.4 */

    function add_css$a() {
    	var style = element("style");
    	style.id = "svelte-tdi7la-style";
    	style.textContent = ".block.svelte-tdi7la{display:block}.title.svelte-tdi7la{display:block;font-size:var(--text-size-title);font-weight:400;margin:8px 0px}.header.svelte-tdi7la{display:block;font-size:var(--text-size-header);font-weight:400;margin:4px 0px}.variant-secondary.svelte-tdi7la{color:var(--text-secondary);font-size:var(--text-size-secondary)}.primary.svelte-tdi7la{color:var(--primary)}.secondary.svelte-tdi7la{color:var(--secondary)}.danger.svelte-tdi7la{color:var(--danger)}";
    	append(document.head, style);
    }

    function create_fragment$c(ctx) {
    	let span;
    	let span_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			span = element("span");
    			if (default_slot) default_slot.c();
    			attr(span, "class", span_class_value = "" + (/*variant*/ ctx[0] + " " + /*color*/ ctx[2] + " " + /*klass*/ ctx[3] + " svelte-tdi7la"));
    			toggle_class(span, "block", /*block*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);

    			if (default_slot) {
    				default_slot.m(span, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 16) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*variant, color, klass*/ 13 && span_class_value !== (span_class_value = "" + (/*variant*/ ctx[0] + " " + /*color*/ ctx[2] + " " + /*klass*/ ctx[3] + " svelte-tdi7la"))) {
    				attr(span, "class", span_class_value);
    			}

    			if (dirty & /*variant, color, klass, block*/ 15) {
    				toggle_class(span, "block", /*block*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { variant = "" } = $$props;
    	let { block = false } = $$props;
    	let { color } = $$props;
    	let { class: klass = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("variant" in $$props) $$invalidate(0, variant = $$props.variant);
    		if ("block" in $$props) $$invalidate(1, block = $$props.block);
    		if ("color" in $$props) $$invalidate(2, color = $$props.color);
    		if ("class" in $$props) $$invalidate(3, klass = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*variant*/ 1) ;
    	};

    	return [variant, block, color, klass, $$scope, slots];
    }

    class Text extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-tdi7la-style")) add_css$a();
    		init(this, options, instance$a, create_fragment$c, safe_not_equal, { variant: 0, block: 1, color: 2, class: 3 });
    	}
    }

    /* core\drawer.svelte generated by Svelte v3.29.4 */

    function add_css$b() {
    	var style = element("style");
    	style.id = "svelte-1mk1kzg-style";
    	style.textContent = "drawer-wrapper.svelte-1mk1kzg{position:absolute;top:0px;left:0px;height:100vh;min-width:5vw;background-color:var(--card-background)}";
    	append(document.head, style);
    }

    // (30:0) <Modal {open} on:close>
    function create_default_slot$2(ctx) {
    	let drawer_wrapper;
    	let drawer_wrapper_transition;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			drawer_wrapper = element("drawer-wrapper");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(drawer_wrapper, "class", "svelte-1mk1kzg");
    		},
    		m(target, anchor) {
    			insert(target, drawer_wrapper, anchor);

    			if (default_slot) {
    				default_slot.m(drawer_wrapper, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 16) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			add_render_callback(() => {
    				if (!drawer_wrapper_transition) drawer_wrapper_transition = create_bidirectional_transition(drawer_wrapper, /*drawerSlide*/ ctx[1], {}, true);
    				drawer_wrapper_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			if (!drawer_wrapper_transition) drawer_wrapper_transition = create_bidirectional_transition(drawer_wrapper, /*drawerSlide*/ ctx[1], {}, false);
    			drawer_wrapper_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(drawer_wrapper);
    			if (default_slot) default_slot.d(detaching);
    			if (detaching && drawer_wrapper_transition) drawer_wrapper_transition.end();
    		}
    	};
    }

    function create_fragment$d(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				open: /*open*/ ctx[0],
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			}
    		});

    	modal.$on("close", /*close_handler*/ ctx[3]);

    	return {
    		c() {
    			create_component(modal.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const modal_changes = {};
    			if (dirty & /*open*/ 1) modal_changes.open = /*open*/ ctx[0];

    			if (dirty & /*$$scope*/ 16) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { open = false } = $$props;

    	const drawerSlide = (node, options) => {
    		return {
    			delay: 0,
    			duration: 200,
    			css: (t, u) => `
            transform: translateX(-${u * 100}%);
            opacity: ${t};
        `
    		};
    	};

    	function close_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("open" in $$props) $$invalidate(0, open = $$props.open);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	return [open, drawerSlide, slots, close_handler, $$scope];
    }

    class Drawer extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1mk1kzg-style")) add_css$b();
    		init(this, options, instance$b, create_fragment$d, safe_not_equal, { open: 0 });
    	}
    }

    /* core\list.svelte generated by Svelte v3.29.4 */

    function add_css$c() {
    	var style = element("style");
    	style.id = "svelte-ygl8ed-style";
    	style.textContent = "doric-list.svelte-ygl8ed{display:grid;grid-template-columns:1fr;overflow:auto;height:var(--list-height)}doric-list.svelte-ygl8ed>list-item, list-header{display:grid;position:relative;overflow:hidden;padding:12px 16px;color:var(--text-normal);grid-template-areas:\"start-adornment content end-adornment\"\r\n        ;grid-template-columns:auto 1fr auto}doric-list.svelte-ygl8ed>list-header > list-header-content{font-size:var(--text-size-header);font-weight:700}doric-list.svelte-ygl8ed>list-item > a{position:absolute;top:0px;left:0px;bottom:0px;right:0px;opacity:0}doric-list.svelte-ygl8ed>list-item[dividers]{border-top:1px solid var(--text-secondary);border-bottom:1px solid var(--text-secondary);margin-top:-1px}doric-list.svelte-ygl8ed>list-item > list-item-content, list-header > list-header-content{grid-area:content;display:flex;flex-direction:column;justify-content:center;align-items:stretch;grid-area:content}doric-list.svelte-ygl8ed>list-item[control]{padding:0px}list-item.svelte-ygl8ed{border:1px solid blue}";
    	append(document.head, style);
    }

    const get_item_slot_changes = dirty => ({ item: dirty & /*items*/ 1 });
    const get_item_slot_context = ctx => ({ item: /*item*/ ctx[6] });
    const get_header_slot_changes = dirty => ({ item: dirty & /*items*/ 1 });
    const get_header_slot_context = ctx => ({ item: /*item*/ ctx[6] });

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (95:8) {:else}
    function create_else_block(ctx) {
    	let current;
    	const item_slot_template = /*#slots*/ ctx[5].item;
    	const item_slot = create_slot(item_slot_template, ctx, /*$$scope*/ ctx[4], get_item_slot_context);
    	const item_slot_or_fallback = item_slot || fallback_block_1(ctx);

    	return {
    		c() {
    			if (item_slot_or_fallback) item_slot_or_fallback.c();
    		},
    		m(target, anchor) {
    			if (item_slot_or_fallback) {
    				item_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (item_slot) {
    				if (item_slot.p && dirty & /*$$scope, items*/ 17) {
    					update_slot(item_slot, item_slot_template, ctx, /*$$scope*/ ctx[4], dirty, get_item_slot_changes, get_item_slot_context);
    				}
    			} else {
    				if (item_slot_or_fallback && item_slot_or_fallback.p && dirty & /*items*/ 1) {
    					item_slot_or_fallback.p(ctx, dirty);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(item_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(item_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (item_slot_or_fallback) item_slot_or_fallback.d(detaching);
    		}
    	};
    }

    // (87:8) {#if item.header !== undefined}
    function create_if_block$2(ctx) {
    	let current;
    	const header_slot_template = /*#slots*/ ctx[5].header;
    	const header_slot = create_slot(header_slot_template, ctx, /*$$scope*/ ctx[4], get_header_slot_context);
    	const header_slot_or_fallback = header_slot || fallback_block(ctx);

    	return {
    		c() {
    			if (header_slot_or_fallback) header_slot_or_fallback.c();
    		},
    		m(target, anchor) {
    			if (header_slot_or_fallback) {
    				header_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (header_slot) {
    				if (header_slot.p && dirty & /*$$scope, items*/ 17) {
    					update_slot(header_slot, header_slot_template, ctx, /*$$scope*/ ctx[4], dirty, get_header_slot_changes, get_header_slot_context);
    				}
    			} else {
    				if (header_slot_or_fallback && header_slot_or_fallback.p && dirty & /*items*/ 1) {
    					header_slot_or_fallback.p(ctx, dirty);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(header_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(header_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (header_slot_or_fallback) header_slot_or_fallback.d(detaching);
    		}
    	};
    }

    // (96:37)                   
    function fallback_block_1(ctx) {
    	let list_item;
    	let list_item_content;
    	let t0_value = (/*item*/ ctx[6] ?? "") + "";
    	let t0;
    	let t1;

    	return {
    		c() {
    			list_item = element("list-item");
    			list_item_content = element("list-item-content");
    			t0 = text(t0_value);
    			t1 = space();
    			set_custom_element_data(list_item, "class", "svelte-ygl8ed");
    		},
    		m(target, anchor) {
    			insert(target, list_item, anchor);
    			append(list_item, list_item_content);
    			append(list_item_content, t0);
    			insert(target, t1, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*items*/ 1 && t0_value !== (t0_value = (/*item*/ ctx[6] ?? "") + "")) set_data(t0, t0_value);
    		},
    		d(detaching) {
    			if (detaching) detach(list_item);
    			if (detaching) detach(t1);
    		}
    	};
    }

    // (88:39)                   
    function fallback_block(ctx) {
    	let list_header;
    	let list_header_content;
    	let t0_value = /*item*/ ctx[6].header + "";
    	let t0;
    	let t1;

    	return {
    		c() {
    			list_header = element("list-header");
    			list_header_content = element("list-header-content");
    			t0 = text(t0_value);
    			t1 = space();
    		},
    		m(target, anchor) {
    			insert(target, list_header, anchor);
    			append(list_header, list_header_content);
    			append(list_header_content, t0);
    			insert(target, t1, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*items*/ 1 && t0_value !== (t0_value = /*item*/ ctx[6].header + "")) set_data(t0, t0_value);
    		},
    		d(detaching) {
    			if (detaching) detach(list_header);
    			if (detaching) detach(t1);
    		}
    	};
    }

    // (86:4) {#each items as item}
    function create_each_block$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$2, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*item*/ ctx[6].header !== undefined) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function create_fragment$e(ctx) {
    	let doric_list;
    	let doric_list_class_value;
    	let current;
    	let each_value = /*items*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			doric_list = element("doric-list");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_custom_element_data(doric_list, "class", doric_list_class_value = "" + (null_to_empty(/*klass*/ ctx[3]) + " svelte-ygl8ed"));
    			set_style(doric_list, "--list-height", /*height*/ ctx[1]);
    			toggle_class(doric_list, "compact", /*compact*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, doric_list, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(doric_list, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*items, $$scope, undefined*/ 17) {
    				each_value = /*items*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(doric_list, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*klass*/ 8 && doric_list_class_value !== (doric_list_class_value = "" + (null_to_empty(/*klass*/ ctx[3]) + " svelte-ygl8ed"))) {
    				set_custom_element_data(doric_list, "class", doric_list_class_value);
    			}

    			if (!current || dirty & /*height*/ 2) {
    				set_style(doric_list, "--list-height", /*height*/ ctx[1]);
    			}

    			if (dirty & /*klass, compact*/ 12) {
    				toggle_class(doric_list, "compact", /*compact*/ ctx[2]);
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_list);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { items = [] } = $$props;
    	let { height } = $$props;
    	let { compact } = $$props;
    	let { class: klass = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    		if ("height" in $$props) $$invalidate(1, height = $$props.height);
    		if ("compact" in $$props) $$invalidate(2, compact = $$props.compact);
    		if ("class" in $$props) $$invalidate(3, klass = $$props.class);
    		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	return [items, height, compact, klass, $$scope, slots];
    }

    class List extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-ygl8ed-style")) add_css$c();

    		init(this, options, instance$c, create_fragment$e, safe_not_equal, {
    			items: 0,
    			height: 1,
    			compact: 2,
    			class: 3
    		});
    	}
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /* core\tabs.svelte generated by Svelte v3.29.4 */

    function create_fragment$f(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[1], dirty, null, null);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    const tabContext = {};

    function instance$d($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { selectedTab = null } = $$props;
    	const currentTab = writable(selectedTab);
    	setContext(tabContext, currentTab);
    	onMount(() => currentTab.subscribe(next => $$invalidate(0, selectedTab = next)));

    	$$self.$$set = $$props => {
    		if ("selectedTab" in $$props) $$invalidate(0, selectedTab = $$props.selectedTab);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*selectedTab*/ 1) {
    			 currentTab.set(selectedTab);
    		}
    	};

    	return [selectedTab, $$scope, slots];
    }

    class Tabs extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$d, create_fragment$f, safe_not_equal, { selectedTab: 0 });
    	}
    }

    /* core\tabs\panel.svelte generated by Svelte v3.29.4 */

    function add_css$d() {
    	var style = element("style");
    	style.id = "svelte-f2qpgf-style";
    	style.textContent = "tab-panel.svelte-f2qpgf{display:none;grid-area:panel}tab-panel.active.svelte-f2qpgf{display:block}";
    	append(document.head, style);
    }

    function create_fragment$g(ctx) {
    	let tab_panel;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	return {
    		c() {
    			tab_panel = element("tab-panel");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(tab_panel, "class", "svelte-f2qpgf");
    			toggle_class(tab_panel, "active", /*$currentTab*/ ctx[1] === /*value*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, tab_panel, anchor);

    			if (default_slot) {
    				default_slot.m(tab_panel, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 8) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
    				}
    			}

    			if (dirty & /*$currentTab, value*/ 3) {
    				toggle_class(tab_panel, "active", /*$currentTab*/ ctx[1] === /*value*/ ctx[0]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(tab_panel);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let $currentTab;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { value } = $$props;
    	const currentTab = getContext(tabContext);
    	component_subscribe($$self, currentTab, value => $$invalidate(1, $currentTab = value));

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	return [value, $currentTab, currentTab, $$scope, slots];
    }

    class Panel extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-f2qpgf-style")) add_css$d();
    		init(this, options, instance$e, create_fragment$g, safe_not_equal, { value: 0 });
    	}
    }

    /* core\title-bar.svelte generated by Svelte v3.29.4 */

    function add_css$e() {
    	var style = element("style");
    	style.id = "svelte-1rk9s8w-style";
    	style.textContent = "doric-title-bar.svelte-1rk9s8w{position:relative;z-index:+0;height:56px;background-color:var(--title-bar-background);color:var(--title-bar-text);display:grid;grid-template-columns:min-content auto min-content;grid-template-areas:\"start-adornment title end-adornment\"\r\n        ;box-shadow:0px 2px 2px rgba(0, 0, 0, 0.25);--text-normal:var(--title-bar-text);--ripple-color:var(--ripple-dark)}doric-title-bar.sticky.svelte-1rk9s8w{position:sticky;top:0px;left:0px;right:0px;z-index:+50}doric-title-bar.svelte-1rk9s8w>title-text{grid-area:title;font-size:var(--text-size-title);display:flex;align-items:center;padding:8px;font-weight:700;user-select:none}doric-title-bar.center.svelte-1rk9s8w>title-text{justify-content:center}";
    	append(document.head, style);
    }

    function create_fragment$h(ctx) {
    	let doric_title_bar;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			doric_title_bar = element("doric-title-bar");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(doric_title_bar, "class", "svelte-1rk9s8w");
    			toggle_class(doric_title_bar, "sticky", /*sticky*/ ctx[0]);
    			toggle_class(doric_title_bar, "center", /*center*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, doric_title_bar, anchor);

    			if (default_slot) {
    				default_slot.m(doric_title_bar, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 4) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
    				}
    			}

    			if (dirty & /*sticky*/ 1) {
    				toggle_class(doric_title_bar, "sticky", /*sticky*/ ctx[0]);
    			}

    			if (dirty & /*center*/ 2) {
    				toggle_class(doric_title_bar, "center", /*center*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_title_bar);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { sticky } = $$props;
    	let { center } = $$props;

    	$$self.$$set = $$props => {
    		if ("sticky" in $$props) $$invalidate(0, sticky = $$props.sticky);
    		if ("center" in $$props) $$invalidate(1, center = $$props.center);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [sticky, center, $$scope, slots];
    }

    class Title_bar extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1rk9s8w-style")) add_css$e();
    		init(this, options, instance$f, create_fragment$h, safe_not_equal, { sticky: 0, center: 1 });
    	}
    }

    /* core\theme\dark.svelte generated by Svelte v3.29.4 */

    function create_fragment$i(ctx) {
    	let html_tag;
    	let html_anchor;

    	return {
    		c() {
    			html_anchor = empty();
    			html_tag = new HtmlTag(html_anchor);
    		},
    		m(target, anchor) {
    			html_tag.m(/*theme*/ ctx[0], target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    function instance$g($$self) {
    	const theme = css`
        body {
            --font: Inconsolata;
            --background: #161616;
            --background-layer: #333333;
            --background-highlight: #171717;
            --layer-border-width: 1px;

            --ripple-dark: #00000060;
            --ripple-light: #FFFFFF60;
            --text-light: white;
            --text-dark: black;

            --primary: #00aaff;
            --primary-ripple: #00aaff60;
            --secondary: #2fbc2f;
            --secondary-ripple: #2fbc2f60;
            --danger: #df5348;
            --danger-ripple: #df534860;

            --text-normal: var(--text-light);
            --text-secondary: #a0a0a0;
            --text-invert: var(--text-dark);

            --text-size: 14px;
            --text-size-title: 18px;
            --text-size-header: 16px;
            --text-size-info: 13px;
            --text-size-secondary: 12px;

            --ripple-normal: var(--ripple-light);
            --ripple-invert: var(--ripple-dark);
        }
    `;

    	return [theme];
    }

    class Dark extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$g, create_fragment$i, safe_not_equal, {});
    	}
    }

    /* core\theme\light.svelte generated by Svelte v3.29.4 */

    function create_fragment$j(ctx) {
    	let html_tag;
    	let html_anchor;

    	return {
    		c() {
    			html_anchor = empty();
    			html_tag = new HtmlTag(html_anchor);
    		},
    		m(target, anchor) {
    			html_tag.m(/*theme*/ ctx[0], target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    function instance$h($$self) {
    	const theme = css`
        body {
            --font: Roboto;
            --background: #e9e9e9;
            --background-layer: #ffffff;
            --layer-border-width: 0px;

            --ripple-dark: #00000060;
            --ripple-light: #FFFFFF60;
            --text-light: white;
            --text-dark: black;

            --primary: #1d62d5;
            --primary-ripple: #1d62d560;
            --secondary: #128f12;
            --secondary-ripple: #128f1260;
            --danger: #F44336;
            --danger-ripple: #F4433660;

            --text-normal: var(--text-dark);
            --text-secondary: #505050;
            --text-invert: var(--text-light);

            --text-size: 14px;
            --text-size-title: 18px;
            --text-size-header: 16px;
            --text-size-info: 13px;
            --text-size-secondary: 12px;

            --ripple-normal: var(--ripple-dark);
            --ripple-invert: var(--ripple-light);
        }
    `;

    	return [theme];
    }

    class Light extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$h, create_fragment$j, safe_not_equal, {});
    	}
    }

    const readHash = () => document.location.hash.toString().slice(1);
    const hashStore = readable(
        readHash(),
        set => {
            const scanner = setInterval(
                () => set(readHash()),
                20
            );
            return () => clearInterval(scanner)
        }
    );
    // let currentHash = readHash()
    // setInterval(
    //     () => {
    //         const hash = readHash()
    //         if (hash !== currentHash) {
    //             const evt = new CustomEvent("hashupdate")
    //             evt.oldHash = currentHash
    //             evt.newHash = hash
    //             currentHash = hash
    //             window.dispatchEvent(evt)
    //         }
    //     },
    //     30
    // )

    /* demo\src\components\button.svelte generated by Svelte v3.29.4 */

    function add_css$f() {
    	var style = element("style");
    	style.id = "svelte-qipcer-style";
    	style.textContent = "grid.svelte-qipcer{display:grid;grid-template-columns:repeat(4, 1fr);grid-gap:4px}";
    	append(document.head, style);
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (29:8) <Text variant="title">
    function create_default_slot_5(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Buttons");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (36:16) <Text variant="header">
    function create_default_slot_4(ctx) {
    	let t0;
    	let t1_value = /*variant*/ ctx[4] + "";
    	let t1;

    	return {
    		c() {
    			t0 = text("Button Variant: ");
    			t1 = text(t1_value);
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    		}
    	};
    }

    // (41:24) <Button                              {variant} {color}                              on:click={showClick(variant, color)}                          >
    function create_default_slot_3(ctx) {
    	let t0_value = /*variant*/ ctx[4] + "";
    	let t0;
    	let t1;
    	let t2_value = /*color*/ ctx[7] + "";
    	let t2;

    	return {
    		c() {
    			t0 = text(t0_value);
    			t1 = text(" / ");
    			t2 = text(t2_value);
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    			insert(target, t2, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    			if (detaching) detach(t2);
    		}
    	};
    }

    // (40:20) {#each buttonColors as color}
    function create_each_block_2(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				variant: /*variant*/ ctx[4],
    				color: /*color*/ ctx[7],
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("click", /*showClick*/ ctx[3](/*variant*/ ctx[4], /*color*/ ctx[7]));

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (49:24) <Button                              {variant} {color}                              disabled                              on:click={showClick(variant, color)}                          >
    function create_default_slot_2(ctx) {
    	let t0;
    	let t1_value = /*variant*/ ctx[4] + "";
    	let t1;
    	let t2;
    	let t3_value = /*color*/ ctx[7] + "";
    	let t3;

    	return {
    		c() {
    			t0 = text("disabled - ");
    			t1 = text(t1_value);
    			t2 = text(" / ");
    			t3 = text(t3_value);
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, t1, anchor);
    			insert(target, t2, anchor);
    			insert(target, t3, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(t1);
    			if (detaching) detach(t2);
    			if (detaching) detach(t3);
    		}
    	};
    }

    // (48:20) {#each buttonColors as color}
    function create_each_block_1(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				variant: /*variant*/ ctx[4],
    				color: /*color*/ ctx[7],
    				disabled: true,
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("click", /*showClick*/ ctx[3](/*variant*/ ctx[4], /*color*/ ctx[7]));

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (34:8) <Card>
    function create_default_slot_1$1(ctx) {
    	let card_content;
    	let text_1;
    	let t0;
    	let grid;
    	let t1;
    	let current;

    	text_1 = new Text({
    			props: {
    				variant: "header",
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			}
    		});

    	let each_value_2 = /*buttonColors*/ ctx[2];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value_1 = /*buttonColors*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out_1 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			card_content = element("card-content");
    			create_component(text_1.$$.fragment);
    			t0 = space();
    			grid = element("grid");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(grid, "class", "svelte-qipcer");
    		},
    		m(target, anchor) {
    			insert(target, card_content, anchor);
    			mount_component(text_1, card_content, null);
    			append(card_content, t0);
    			append(card_content, grid);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(grid, null);
    			}

    			append(grid, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(grid, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);

    			if (dirty & /*buttonTypes, buttonColors, showClick*/ 14) {
    				each_value_2 = /*buttonColors*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_2(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(grid, t1);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks_1.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*buttonTypes, buttonColors, showClick*/ 14) {
    				each_value_1 = /*buttonColors*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(grid, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out_1(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(card_content);
    			destroy_component(text_1);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (33:4) {#each buttonTypes as variant}
    function create_each_block$2(ctx) {
    	let card;
    	let current;

    	card = new Card({
    			props: {
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(card.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const card_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(card, detaching);
    		}
    	};
    }

    // (27:0) <Card>
    function create_default_slot$3(ctx) {
    	let card_content0;
    	let text_1;
    	let t0;
    	let t1;
    	let card_content1;
    	let t2;
    	let t3_value = /*clicked*/ ctx[0].join(" / ") + "";
    	let t3;
    	let current;

    	text_1 = new Text({
    			props: {
    				variant: "title",
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			}
    		});

    	let each_value = /*buttonTypes*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			card_content0 = element("card-content");
    			create_component(text_1.$$.fragment);
    			t0 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			card_content1 = element("card-content");
    			t2 = text("Clicked: ");
    			t3 = text(t3_value);
    		},
    		m(target, anchor) {
    			insert(target, card_content0, anchor);
    			mount_component(text_1, card_content0, null);
    			insert(target, t0, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, t1, anchor);
    			insert(target, card_content1, anchor);
    			append(card_content1, t2);
    			append(card_content1, t3);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const text_1_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				text_1_changes.$$scope = { dirty, ctx };
    			}

    			text_1.$set(text_1_changes);

    			if (dirty & /*buttonColors, buttonTypes, showClick*/ 14) {
    				each_value = /*buttonTypes*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t1.parentNode, t1);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if ((!current || dirty & /*clicked*/ 1) && t3_value !== (t3_value = /*clicked*/ ctx[0].join(" / ") + "")) set_data(t3, t3_value);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(text_1.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(card_content0);
    			destroy_component(text_1);
    			if (detaching) detach(t0);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(t1);
    			if (detaching) detach(card_content1);
    		}
    	};
    }

    function create_fragment$k(ctx) {
    	let card;
    	let current;

    	card = new Card({
    			props: {
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(card.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const card_changes = {};

    			if (dirty & /*$$scope, clicked*/ 4097) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(card, detaching);
    		}
    	};
    }

    function instance$i($$self, $$props, $$invalidate) {
    	let clicked = [];
    	const buttonTypes = ["normal", "outline", "fill"];
    	const buttonColors = ["default", "primary", "secondary", "danger"];
    	const showClick = (variant, color) => evt => $$invalidate(0, clicked = [variant, color]);
    	return [clicked, buttonTypes, buttonColors, showClick];
    }

    class Button_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-qipcer-style")) add_css$f();
    		init(this, options, instance$i, create_fragment$k, safe_not_equal, {});
    	}
    }

    /* demo\src\components\chip.svelte generated by Svelte v3.29.4 */

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (20:4) <TitleBar>
    function create_default_slot_5$1(ctx) {
    	let title_text;

    	return {
    		c() {
    			title_text = element("title-text");
    			title_text.textContent = "Chips";
    		},
    		m(target, anchor) {
    			insert(target, title_text, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(title_text);
    		}
    	};
    }

    // (31:20) <Adornment position="start">
    function create_default_slot_4$1(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "check" } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (30:16) <Chip label={color} {color} clickable on:tap={() => console.log(color)}>
    function create_default_slot_3$1(ctx) {
    	let adornment;
    	let current;

    	adornment = new Adornment({
    			props: {
    				position: "start",
    				$$slots: { default: [create_default_slot_4$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(adornment.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(adornment, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const adornment_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				adornment_changes.$$scope = { dirty, ctx };
    			}

    			adornment.$set(adornment_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(adornment.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(adornment.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(adornment, detaching);
    		}
    	};
    }

    // (36:20) <Adornment position="end">
    function create_default_slot_2$1(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "close" } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (35:16) <Chip label={color} {color} clickable on:tap={() => console.log(color)}>
    function create_default_slot_1$2(ctx) {
    	let adornment;
    	let current;

    	adornment = new Adornment({
    			props: {
    				position: "end",
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(adornment.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(adornment, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const adornment_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				adornment_changes.$$scope = { dirty, ctx };
    			}

    			adornment.$set(adornment_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(adornment.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(adornment.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(adornment, detaching);
    		}
    	};
    }

    // (26:8) {#each colors as color}
    function create_each_block$3(ctx) {
    	let div;
    	let chip0;
    	let t0;
    	let chip1;
    	let t1;
    	let chip2;
    	let t2;
    	let chip3;
    	let t3;
    	let current;

    	chip0 = new Chip({
    			props: {
    				label: /*color*/ ctx[3],
    				color: /*color*/ ctx[3]
    			}
    		});

    	chip1 = new Chip({
    			props: {
    				label: /*color*/ ctx[3],
    				color: /*color*/ ctx[3],
    				clickable: true
    			}
    		});

    	function tap_handler(...args) {
    		return /*tap_handler*/ ctx[1](/*color*/ ctx[3], ...args);
    	}

    	chip2 = new Chip({
    			props: {
    				label: /*color*/ ctx[3],
    				color: /*color*/ ctx[3],
    				clickable: true,
    				$$slots: { default: [create_default_slot_3$1] },
    				$$scope: { ctx }
    			}
    		});

    	chip2.$on("tap", tap_handler);

    	function tap_handler_1(...args) {
    		return /*tap_handler_1*/ ctx[2](/*color*/ ctx[3], ...args);
    	}

    	chip3 = new Chip({
    			props: {
    				label: /*color*/ ctx[3],
    				color: /*color*/ ctx[3],
    				clickable: true,
    				$$slots: { default: [create_default_slot_1$2] },
    				$$scope: { ctx }
    			}
    		});

    	chip3.$on("tap", tap_handler_1);

    	return {
    		c() {
    			div = element("div");
    			create_component(chip0.$$.fragment);
    			t0 = space();
    			create_component(chip1.$$.fragment);
    			t1 = space();
    			create_component(chip2.$$.fragment);
    			t2 = space();
    			create_component(chip3.$$.fragment);
    			t3 = space();
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(chip0, div, null);
    			append(div, t0);
    			mount_component(chip1, div, null);
    			append(div, t1);
    			mount_component(chip2, div, null);
    			append(div, t2);
    			mount_component(chip3, div, null);
    			append(div, t3);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const chip2_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				chip2_changes.$$scope = { dirty, ctx };
    			}

    			chip2.$set(chip2_changes);
    			const chip3_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				chip3_changes.$$scope = { dirty, ctx };
    			}

    			chip3.$set(chip3_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(chip0.$$.fragment, local);
    			transition_in(chip1.$$.fragment, local);
    			transition_in(chip2.$$.fragment, local);
    			transition_in(chip3.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(chip0.$$.fragment, local);
    			transition_out(chip1.$$.fragment, local);
    			transition_out(chip2.$$.fragment, local);
    			transition_out(chip3.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(chip0);
    			destroy_component(chip1);
    			destroy_component(chip2);
    			destroy_component(chip3);
    		}
    	};
    }

    // (19:0) <Card>
    function create_default_slot$4(ctx) {
    	let titlebar;
    	let t;
    	let card_content;
    	let current;

    	titlebar = new Title_bar({
    			props: {
    				$$slots: { default: [create_default_slot_5$1] },
    				$$scope: { ctx }
    			}
    		});

    	let each_value = /*colors*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			create_component(titlebar.$$.fragment);
    			t = space();
    			card_content = element("card-content");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    		},
    		m(target, anchor) {
    			mount_component(titlebar, target, anchor);
    			insert(target, t, anchor);
    			insert(target, card_content, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(card_content, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			const titlebar_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				titlebar_changes.$$scope = { dirty, ctx };
    			}

    			titlebar.$set(titlebar_changes);

    			if (dirty & /*colors, console*/ 1) {
    				each_value = /*colors*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(card_content, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(titlebar.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(titlebar.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_component(titlebar, detaching);
    			if (detaching) detach(t);
    			if (detaching) detach(card_content);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function create_fragment$l(ctx) {
    	let card;
    	let current;

    	card = new Card({
    			props: {
    				$$slots: { default: [create_default_slot$4] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(card.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const card_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(card, detaching);
    		}
    	};
    }

    function instance$j($$self) {
    	const colors = ["normal", "primary", "secondary", "danger"];
    	const tap_handler = color => console.log(color);
    	const tap_handler_1 = color => console.log(color);
    	return [colors, tap_handler, tap_handler_1];
    }

    class Chip_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$j, create_fragment$l, safe_not_equal, {});
    	}
    }

    /* demo\src\app.svelte generated by Svelte v3.29.4 */

    const { document: document_1 } = globals;

    function add_css$g() {
    	var style = element("style");
    	style.id = "svelte-1kt789m-style";
    	style.textContent = "page-layout.svelte-1kt789m{display:grid;grid-template-rows:min-content auto}demo-area.svelte-1kt789m{display:block;width:100%;max-width:1024px;margin:auto}";
    	append(document_1.head, style);
    }

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i][0];
    	child_ctx[14] = list[i][1];
    	return child_ctx;
    }

    // (99:12) <Button on:tap={openMenu} fab round="40px">
    function create_default_slot_10(ctx) {
    	let icon;
    	let current;
    	icon = new Icon({ props: { name: "menu", size: "22px" } });

    	return {
    		c() {
    			create_component(icon.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};
    }

    // (98:8) <Adornment position="start">
    function create_default_slot_9(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				fab: true,
    				round: "40px",
    				$$slots: { default: [create_default_slot_10] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("tap", /*openMenu*/ ctx[7]);

    	return {
    		c() {
    			create_component(button.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 262144) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    }

    // (104:8) <Adornment position="end">
    function create_default_slot_8(ctx) {
    	let checkbox;
    	let updating_checked;
    	let current;

    	function checkbox_checked_binding(value) {
    		/*checkbox_checked_binding*/ ctx[9].call(null, value);
    	}

    	let checkbox_props = {
    		uncheckedIcon: "brightness_high",
    		checkedIcon: "brightness_low"
    	};

    	if (/*checked*/ ctx[0] !== void 0) {
    		checkbox_props.checked = /*checked*/ ctx[0];
    	}

    	checkbox = new Checkbox({ props: checkbox_props });
    	binding_callbacks.push(() => bind(checkbox, "checked", checkbox_checked_binding));

    	return {
    		c() {
    			create_component(checkbox.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(checkbox, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const checkbox_changes = {};

    			if (!updating_checked && dirty & /*checked*/ 1) {
    				updating_checked = true;
    				checkbox_changes.checked = /*checked*/ ctx[0];
    				add_flush_callback(() => updating_checked = false);
    			}

    			checkbox.$set(checkbox_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(checkbox.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(checkbox.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(checkbox, detaching);
    		}
    	};
    }

    // (93:4) <TitleBar sticky>
    function create_default_slot_7(ctx) {
    	let title_text;
    	let t1;
    	let adornment0;
    	let t2;
    	let adornment1;
    	let current;

    	adornment0 = new Adornment({
    			props: {
    				position: "start",
    				$$slots: { default: [create_default_slot_9] },
    				$$scope: { ctx }
    			}
    		});

    	adornment1 = new Adornment({
    			props: {
    				position: "end",
    				$$slots: { default: [create_default_slot_8] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			title_text = element("title-text");
    			title_text.textContent = "Svelte Doric Components";
    			t1 = space();
    			create_component(adornment0.$$.fragment);
    			t2 = space();
    			create_component(adornment1.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, title_text, anchor);
    			insert(target, t1, anchor);
    			mount_component(adornment0, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(adornment1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const adornment0_changes = {};

    			if (dirty & /*$$scope*/ 262144) {
    				adornment0_changes.$$scope = { dirty, ctx };
    			}

    			adornment0.$set(adornment0_changes);
    			const adornment1_changes = {};

    			if (dirty & /*$$scope, checked*/ 262145) {
    				adornment1_changes.$$scope = { dirty, ctx };
    			}

    			adornment1.$set(adornment1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(adornment0.$$.fragment, local);
    			transition_in(adornment1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(adornment0.$$.fragment, local);
    			transition_out(adornment1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(title_text);
    			if (detaching) detach(t1);
    			destroy_component(adornment0, detaching);
    			if (detaching) detach(t2);
    			destroy_component(adornment1, detaching);
    		}
    	};
    }

    // (116:12) <TitleBar>
    function create_default_slot_6(ctx) {
    	let title_text;

    	return {
    		c() {
    			title_text = element("title-text");
    			title_text.textContent = "Components";
    		},
    		m(target, anchor) {
    			insert(target, title_text, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(title_text);
    		}
    	};
    }

    // (124:24) <Button on:tap={nav(item)}>
    function create_default_slot_5$2(ctx) {
    	let t_value = /*item*/ ctx[17].replace(/\b\w/g, func) + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*item*/ 131072 && t_value !== (t_value = /*item*/ ctx[17].replace(/\b\w/g, func) + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (122:16) <list-item let:item slot="item" dividers control>
    function create_item_slot(ctx) {
    	let list_item;
    	let list_item_content;
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_5$2] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("tap", function () {
    		if (is_function(/*nav*/ ctx[6](/*item*/ ctx[17]))) /*nav*/ ctx[6](/*item*/ ctx[17]).apply(this, arguments);
    	});

    	return {
    		c() {
    			list_item = element("list-item");
    			list_item_content = element("list-item-content");
    			create_component(button.$$.fragment);
    			set_custom_element_data(list_item, "slot", "item");
    			set_custom_element_data(list_item, "dividers", "");
    			set_custom_element_data(list_item, "control", "");
    		},
    		m(target, anchor) {
    			insert(target, list_item, anchor);
    			append(list_item, list_item_content);
    			mount_component(button, list_item_content, null);
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};

    			if (dirty & /*$$scope, item*/ 393216) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(list_item);
    			destroy_component(button);
    		}
    	};
    }

    // (114:8) <Drawer bind:open on:close={closeMenu}>
    function create_default_slot_3$2(ctx) {
    	let div;
    	let t0;
    	let titlebar;
    	let t1;
    	let list;
    	let current;

    	titlebar = new Title_bar({
    			props: {
    				$$slots: { default: [create_default_slot_6] },
    				$$scope: { ctx }
    			}
    		});

    	list = new List({
    			props: {
    				items: /*demoList*/ ctx[5],
    				$$slots: {
    					item: [
    						create_item_slot,
    						({ item }) => ({ 17: item }),
    						({ item }) => item ? 131072 : 0
    					]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			div = element("div");
    			t0 = space();
    			create_component(titlebar.$$.fragment);
    			t1 = space();
    			create_component(list.$$.fragment);
    			set_style(div, "width", "15vw");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			insert(target, t0, anchor);
    			mount_component(titlebar, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(list, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const titlebar_changes = {};

    			if (dirty & /*$$scope*/ 262144) {
    				titlebar_changes.$$scope = { dirty, ctx };
    			}

    			titlebar.$set(titlebar_changes);
    			const list_changes = {};

    			if (dirty & /*$$scope, item*/ 393216) {
    				list_changes.$$scope = { dirty, ctx };
    			}

    			list.$set(list_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(titlebar.$$.fragment, local);
    			transition_in(list.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(titlebar.$$.fragment, local);
    			transition_out(list.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (detaching) detach(t0);
    			destroy_component(titlebar, detaching);
    			if (detaching) detach(t1);
    			destroy_component(list, detaching);
    		}
    	};
    }

    // (133:12) <TabPanel value="">
    function create_default_slot_2$2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Testing?");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (137:16) <TabPanel value="/{demo}">
    function create_default_slot_1$3(ctx) {
    	let switch_instance;
    	let t;
    	let current;
    	var switch_value = /*component*/ ctx[14];

    	function switch_props(ctx) {
    		return {};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			t = space();
    		},
    		m(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert(target, t, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (switch_value !== (switch_value = /*component*/ ctx[14])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, t.parentNode, t);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (switch_instance) destroy_component(switch_instance, detaching);
    			if (detaching) detach(t);
    		}
    	};
    }

    // (136:12) {#each Object.entries(demos) as [demo, component]}
    function create_each_block$4(ctx) {
    	let tabpanel;
    	let current;

    	tabpanel = new Panel({
    			props: {
    				value: "/" + /*demo*/ ctx[13],
    				$$slots: { default: [create_default_slot_1$3] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(tabpanel.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(tabpanel, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const tabpanel_changes = {};

    			if (dirty & /*$$scope*/ 262144) {
    				tabpanel_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel.$set(tabpanel_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tabpanel.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(tabpanel.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(tabpanel, detaching);
    		}
    	};
    }

    // (113:4) <Tabs bind:selectedTab>
    function create_default_slot$5(ctx) {
    	let drawer;
    	let updating_open;
    	let t0;
    	let demo_area;
    	let tabpanel;
    	let t1;
    	let current;

    	function drawer_open_binding(value) {
    		/*drawer_open_binding*/ ctx[10].call(null, value);
    	}

    	let drawer_props = {
    		$$slots: { default: [create_default_slot_3$2] },
    		$$scope: { ctx }
    	};

    	if (/*open*/ ctx[1] !== void 0) {
    		drawer_props.open = /*open*/ ctx[1];
    	}

    	drawer = new Drawer({ props: drawer_props });
    	binding_callbacks.push(() => bind(drawer, "open", drawer_open_binding));
    	drawer.$on("close", /*closeMenu*/ ctx[8]);

    	tabpanel = new Panel({
    			props: {
    				value: "",
    				$$slots: { default: [create_default_slot_2$2] },
    				$$scope: { ctx }
    			}
    		});

    	let each_value = Object.entries(/*demos*/ ctx[4]);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			create_component(drawer.$$.fragment);
    			t0 = space();
    			demo_area = element("demo-area");
    			create_component(tabpanel.$$.fragment);
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_custom_element_data(demo_area, "class", "svelte-1kt789m");
    		},
    		m(target, anchor) {
    			mount_component(drawer, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, demo_area, anchor);
    			mount_component(tabpanel, demo_area, null);
    			append(demo_area, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(demo_area, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			const drawer_changes = {};

    			if (dirty & /*$$scope*/ 262144) {
    				drawer_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_open && dirty & /*open*/ 2) {
    				updating_open = true;
    				drawer_changes.open = /*open*/ ctx[1];
    				add_flush_callback(() => updating_open = false);
    			}

    			drawer.$set(drawer_changes);
    			const tabpanel_changes = {};

    			if (dirty & /*$$scope*/ 262144) {
    				tabpanel_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel.$set(tabpanel_changes);

    			if (dirty & /*Object, demos*/ 16) {
    				each_value = Object.entries(/*demos*/ ctx[4]);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(demo_area, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(drawer.$$.fragment, local);
    			transition_in(tabpanel.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(drawer.$$.fragment, local);
    			transition_out(tabpanel.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_component(drawer, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(demo_area);
    			destroy_component(tabpanel);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function create_fragment$m(ctx) {
    	let appstyle;
    	let t0;
    	let page_layout;
    	let titlebar;
    	let t1;
    	let tabs;
    	let updating_selectedTab;
    	let current;

    	appstyle = new App_style({
    			props: { theme: /*theme*/ ctx[3], baseline: Baseline }
    		});

    	titlebar = new Title_bar({
    			props: {
    				sticky: true,
    				$$slots: { default: [create_default_slot_7] },
    				$$scope: { ctx }
    			}
    		});

    	function tabs_selectedTab_binding(value) {
    		/*tabs_selectedTab_binding*/ ctx[11].call(null, value);
    	}

    	let tabs_props = {
    		$$slots: { default: [create_default_slot$5] },
    		$$scope: { ctx }
    	};

    	if (/*selectedTab*/ ctx[2] !== void 0) {
    		tabs_props.selectedTab = /*selectedTab*/ ctx[2];
    	}

    	tabs = new Tabs({ props: tabs_props });
    	binding_callbacks.push(() => bind(tabs, "selectedTab", tabs_selectedTab_binding));

    	return {
    		c() {
    			create_component(appstyle.$$.fragment);
    			t0 = space();
    			page_layout = element("page-layout");
    			create_component(titlebar.$$.fragment);
    			t1 = space();
    			create_component(tabs.$$.fragment);
    			set_custom_element_data(page_layout, "class", "svelte-1kt789m");
    		},
    		m(target, anchor) {
    			mount_component(appstyle, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, page_layout, anchor);
    			mount_component(titlebar, page_layout, null);
    			append(page_layout, t1);
    			mount_component(tabs, page_layout, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const appstyle_changes = {};
    			if (dirty & /*theme*/ 8) appstyle_changes.theme = /*theme*/ ctx[3];
    			appstyle.$set(appstyle_changes);
    			const titlebar_changes = {};

    			if (dirty & /*$$scope, checked*/ 262145) {
    				titlebar_changes.$$scope = { dirty, ctx };
    			}

    			titlebar.$set(titlebar_changes);
    			const tabs_changes = {};

    			if (dirty & /*$$scope, open*/ 262146) {
    				tabs_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_selectedTab && dirty & /*selectedTab*/ 4) {
    				updating_selectedTab = true;
    				tabs_changes.selectedTab = /*selectedTab*/ ctx[2];
    				add_flush_callback(() => updating_selectedTab = false);
    			}

    			tabs.$set(tabs_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(appstyle.$$.fragment, local);
    			transition_in(titlebar.$$.fragment, local);
    			transition_in(tabs.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(appstyle.$$.fragment, local);
    			transition_out(titlebar.$$.fragment, local);
    			transition_out(tabs.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(appstyle, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(page_layout);
    			destroy_component(titlebar);
    			destroy_component(tabs);
    		}
    	};
    }

    const func = s => s.toUpperCase();

    function instance$k($$self, $$props, $$invalidate) {
    	let $hash;
    	component_subscribe($$self, hashStore, $$value => $$invalidate(12, $hash = $$value));
    	let checked = JSON.parse(localStorage.themeToggle ?? "false");

    	const demos = {
    		// "app-bar": TitleBarDemo,
    		"button": Button_1,
    		"chip": Chip_1
    	}; // "list": ListDemo,
    	// "textArea": TextAreaDemo,
    	// "textInput": TextInputDemo,

    	// table: TableDemo,
    	// checkbox: CheckboxDemo,
    	const demoList = Object.keys(demos).sort();

    	const nav = location => () => document.location.hash = `/${location}`;
    	let open = false;
    	const openMenu = () => $$invalidate(1, open = true);
    	const closeMenu = () => $$invalidate(1, open = false);

    	function checkbox_checked_binding(value) {
    		checked = value;
    		$$invalidate(0, checked);
    	}

    	function drawer_open_binding(value) {
    		open = value;
    		$$invalidate(1, open);
    	}

    	function tabs_selectedTab_binding(value) {
    		selectedTab = value;
    		($$invalidate(2, selectedTab), $$invalidate(12, $hash));
    	}

    	let selectedTab;
    	let theme;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$hash*/ 4096) {
    			// import TableDemo from "./components/table.svelte"
    			// import TextAreaDemo from "./components/text-area.svelte"
    			// import TextInputDemo from "./components/text-input.svelte"
    			// import CheckboxDemo from "./components/checkbox.svelte"
    			// import NewControl from "./test/new-control.svelte"
    			// const images = {
    			//     tifa: "https://media.discordapp.net/attachments/641431274916937738/726691343111553065/tifa_bikini_alt_by_nopeys_ddyq6fp-fullview.png?width=606&height=937",
    			//     camilla: "https://media.discordapp.net/attachments/641431274916937738/726691793801838642/dcqeyjp-bba7f4f5-a6f0-4b2f-8f15-13967385a3f7.png?width=571&height=937",
    			//     samus: "https://i.etsystatic.com/17439113/r/il/9346c1/2039257844/il_570xN.2039257844_jh20.jpg",
    			//     dnd: "https://media.discordapp.net/attachments/511777706438950922/728027209377513582/3l5ovvzru9851.png",
    			// }
    			// const image = images.dnd
    			 $$invalidate(2, selectedTab = $hash);
    		}

    		if ($$self.$$.dirty & /*checked*/ 1) {
    			 $$invalidate(3, theme = checked === true ? Dark : Light);
    		}

    		if ($$self.$$.dirty & /*checked*/ 1) {
    			 localStorage.themeToggle = JSON.stringify(checked);
    		}

    		if ($$self.$$.dirty & /*$hash*/ 4096) {
    			 closeMenu();
    		}
    	};

    	return [
    		checked,
    		open,
    		selectedTab,
    		theme,
    		demos,
    		demoList,
    		nav,
    		openMenu,
    		closeMenu,
    		checkbox_checked_binding,
    		drawer_open_binding,
    		tabs_selectedTab_binding
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document_1.getElementById("svelte-1kt789m-style")) add_css$g();
    		init(this, options, instance$k, create_fragment$m, safe_not_equal, {});
    	}
    }

    var main = new App({
        target: document.body,
    });

    return main;

}());
