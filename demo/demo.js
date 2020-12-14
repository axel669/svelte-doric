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
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function compute_rest_props(props, keys) {
        const rest = {};
        keys = new Set(keys);
        for (const k in props)
            if (!keys.has(k) && k[0] !== '$')
                rest[k] = props[k];
        return rest;
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
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value') {
                node.value = node[key] = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
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
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
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

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
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
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (107:4) {#each ripples as info (info.id)}
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
    				dispose = action_destroyer(vars_action = vars.call(null, ripple, /*rippleVars*/ ctx[4](/*info*/ ctx[8], /*color*/ ctx[0])));
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (vars_action && is_function(vars_action.update) && dirty & /*ripples, color*/ 3) vars_action.update.call(null, /*rippleVars*/ ctx[4](/*info*/ ctx[8], /*color*/ ctx[0]));
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
    	let mounted;
    	let dispose;
    	let each_value = /*ripples*/ ctx[1];
    	const get_key = ctx => /*info*/ ctx[8].id;

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
    		},
    		m(target, anchor) {
    			insert(target, ripple_wrapper, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ripple_wrapper, null);
    			}

    			/*ripple_wrapper_binding*/ ctx[6](ripple_wrapper);

    			if (!mounted) {
    				dispose = listen(ripple_wrapper, "pointer-start", /*addRipple*/ ctx[3]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*rippleVars, ripples, color*/ 19) {
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

    			/*ripple_wrapper_binding*/ ctx[6](null);
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
    	let container = null;

    	const addRipple = evt => {
    		if (disabled === true) {
    			return;
    		}

    		for (const touch of evt.changedTouches) {
    			const { x, y } = calcOffset(touch);
    			const size = Math.max(container.offsetWidth, container.offsetHeight) * 2;
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

    	function ripple_wrapper_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			container = $$value;
    			$$invalidate(2, container);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    		if ("disabled" in $$props) $$invalidate(5, disabled = $$props.disabled);
    	};

    	return [
    		color,
    		ripples,
    		container,
    		addRipple,
    		rippleVars,
    		disabled,
    		ripple_wrapper_binding
    	];
    }

    class Ripple extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-acwzgw-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, { color: 0, disabled: 5 });
    	}
    }

    /* core\adornment.svelte generated by Svelte v3.29.4 */

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-p8y2y4-style";
    	style.textContent = "adornment.svelte-p8y2y4{display:inline-flex;justify-content:center;align-items:center;padding:4px}adornment.start.svelte-p8y2y4{grid-area:start-adornment}adornment.end.svelte-p8y2y4{grid-area:end-adornment}adornment.stretch.svelte-p8y2y4{align-items:stretch}";
    	append(document.head, style);
    }

    function create_fragment$1(ctx) {
    	let adornment;
    	let adornment_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			adornment = element("adornment");
    			if (default_slot) default_slot.c();
    			attr(adornment, "class", adornment_class_value = "" + (null_to_empty(/*position*/ ctx[0]) + " svelte-p8y2y4"));
    			toggle_class(adornment, "stretch", /*stretch*/ ctx[1]);
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
    				if (default_slot.p && dirty & /*$$scope*/ 4) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*position*/ 1 && adornment_class_value !== (adornment_class_value = "" + (null_to_empty(/*position*/ ctx[0]) + " svelte-p8y2y4"))) {
    				attr(adornment, "class", adornment_class_value);
    			}

    			if (dirty & /*position, stretch*/ 3) {
    				toggle_class(adornment, "stretch", /*stretch*/ ctx[1]);
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
    	let { stretch } = $$props;

    	$$self.$$set = $$props => {
    		if ("position" in $$props) $$invalidate(0, position = $$props.position);
    		if ("stretch" in $$props) $$invalidate(1, stretch = $$props.stretch);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [position, stretch, $$scope, slots];
    }

    class Adornment extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-p8y2y4-style")) add_css$1();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { position: 0, stretch: 1 });
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
    	style.id = "svelte-g1lpii-style";
    	style.textContent = "*{box-sizing:border-box}html{margin:0px;padding:0px;width:100%;height:100%}body{margin:0px;padding:0px;width:100%;min-height:100%;-webkit-tap-highlight-color:transparent;font-family:var(--font);background-color:var(--background);color:var(--text-normal);font-size:var(--text-size);--button-default-fill:#aaaaaa;--button-default-text:var(--text-dark);--button-primary:var(--primary);--button-primary-text:var(--text-dark);--button-primary-ripple:var(--primary-ripple);--button-secondary:var(--secondary);--button-secondary-text:var(--text-dark);--button-secondary-ripple:var(--secondary-ripple);--button-danger:var(--danger);--button-danger-text:var(--text-dark);--button-danger-ripple:var(--danger-ripple);--button-filled-ripple:var(--ripple-invert);--card-background:var(--background-layer);--card-border:var(--layer-border-width) solid var(--text-normal);--control-border:var(--text-secondary);--control-border-focus:var(--primary);--control-border-error:var(--danger);--title-bar-background:var(--primary);--title-bar-text:var(--text-invert)}";
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
    		if (!document.getElementById("svelte-g1lpii-style")) add_css$2();
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
    					listen(doric_button, "tap", /*handleTap*/ ctx[7]),
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

    		// Mobile browsers don't like dispatching events inside custom events
    		setTimeout(() => dispatch("tap", evt), 0);
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
    	style.id = "svelte-zc4q31-style";
    	style.textContent = "doric-card.svelte-zc4q31{display:grid;border-radius:4px;margin:4px;background-color:var(--card-background);border:var(--card-border);box-shadow:0px 2px 4px rgba(0, 0, 0, 0.25)}doric-card.svelte-zc4q31>card-content{display:block;padding:16px}doric-card.svelte-zc4q31>card-actions{display:block;padding:8px}";
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
    			set_custom_element_data(doric_card, "class", doric_card_class_value = "" + (null_to_empty(/*klass*/ ctx[0]) + " svelte-zc4q31"));
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

    			if (!current || dirty & /*klass*/ 1 && doric_card_class_value !== (doric_card_class_value = "" + (null_to_empty(/*klass*/ ctx[0]) + " svelte-zc4q31"))) {
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
    		if (!document.getElementById("svelte-zc4q31-style")) add_css$4();
    		init(this, options, instance$4, create_fragment$5, safe_not_equal, { class: 0 });
    	}
    }

    /* core\icon.svelte generated by Svelte v3.29.4 */

    function add_css$5() {
    	var style = element("style");
    	style.id = "svelte-ckwsqd-style";
    	style.textContent = "doric-icon.svelte-ckwsqd{margin:0px 4px}";
    	append(document.head, style);
    }

    function create_fragment$6(ctx) {
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

    function instance$5($$self, $$props, $$invalidate) {
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
    		if (!document.getElementById("svelte-ckwsqd-style")) add_css$5();
    		init(this, options, instance$5, create_fragment$6, safe_not_equal, { name: 0, outlined: 1, size: 4, class: 2 });
    	}
    }

    /* core\chip.svelte generated by Svelte v3.29.4 */

    function add_css$6() {
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

    function create_fragment$7(ctx) {
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

    function instance$6($$self, $$props, $$invalidate) {
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
    		if (!document.getElementById("svelte-c8trs3-style")) add_css$6();
    		init(this, options, instance$6, create_fragment$7, safe_not_equal, { label: 0, color: 1, clickable: 2 });
    	}
    }

    /* core\portal.svelte generated by Svelte v3.29.4 */

    function create_fragment$8(ctx) {
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
    		init(this, options, instance_1, create_fragment$8, safe_not_equal, {});
    	}
    }

    /* core\modal.svelte generated by Svelte v3.29.4 */

    function add_css$7() {
    	var style = element("style");
    	style.id = "svelte-1k9jxow-style";
    	style.textContent = "modal-wrapper.svelte-1k9jxow{position:fixed;top:0px;left:0px;width:100vw;height:100vh;background-color:rgba(0, 0, 0, 0.35);z-index:100}modal-wrapper.clear.svelte-1k9jxow{background-color:transparent}";
    	append(document.head, style);
    }

    // (36:4) {#if open}
    function create_if_block$1(ctx) {
    	let modal_wrapper;
    	let div;
    	let modal_wrapper_transition;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

    	return {
    		c() {
    			modal_wrapper = element("modal-wrapper");
    			div = element("div");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(modal_wrapper, "class", "svelte-1k9jxow");
    			toggle_class(modal_wrapper, "clear", /*clear*/ ctx[1]);
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
    					listen(div, "tap", stop_propagation(/*tap_handler*/ ctx[5])),
    					listen(modal_wrapper, "tap", /*close*/ ctx[3])
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 64) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[6], dirty, null, null);
    				}
    			}

    			if (dirty & /*clear*/ 2) {
    				toggle_class(modal_wrapper, "clear", /*clear*/ ctx[1]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			add_render_callback(() => {
    				if (!modal_wrapper_transition) modal_wrapper_transition = create_bidirectional_transition(modal_wrapper, fade, /*anim*/ ctx[2], true);
    				modal_wrapper_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			if (!modal_wrapper_transition) modal_wrapper_transition = create_bidirectional_transition(modal_wrapper, fade, /*anim*/ ctx[2], false);
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

    // (35:0) <Portal>
    function create_default_slot(ctx) {
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

    function create_fragment$9(ctx) {
    	let portal;
    	let current;

    	portal = new Portal({
    			props: {
    				$$slots: { default: [create_default_slot] },
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

    			if (dirty & /*$$scope, clear, open*/ 67) {
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

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { open = false } = $$props;
    	let { clear } = $$props;
    	const dispatch = createEventDispatcher();
    	const anim = { duration: 250 };

    	const close = evt => {
    		dispatch("close");
    	};

    	function tap_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("open" in $$props) $$invalidate(0, open = $$props.open);
    		if ("clear" in $$props) $$invalidate(1, clear = $$props.clear);
    		if ("$$scope" in $$props) $$invalidate(6, $$scope = $$props.$$scope);
    	};

    	return [open, clear, anim, close, slots, tap_handler, $$scope];
    }

    class Modal extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1k9jxow-style")) add_css$7();
    		init(this, options, instance$7, create_fragment$9, safe_not_equal, { open: 0, clear: 1 });
    	}
    }

    /* core\text.svelte generated by Svelte v3.29.4 */

    function add_css$8() {
    	var style = element("style");
    	style.id = "svelte-tdi7la-style";
    	style.textContent = ".block.svelte-tdi7la{display:block}.title.svelte-tdi7la{display:block;font-size:var(--text-size-title);font-weight:400;margin:8px 0px}.header.svelte-tdi7la{display:block;font-size:var(--text-size-header);font-weight:400;margin:4px 0px}.variant-secondary.svelte-tdi7la{color:var(--text-secondary);font-size:var(--text-size-secondary)}.primary.svelte-tdi7la{color:var(--primary)}.secondary.svelte-tdi7la{color:var(--secondary)}.danger.svelte-tdi7la{color:var(--danger)}";
    	append(document.head, style);
    }

    function create_fragment$a(ctx) {
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

    function instance$8($$self, $$props, $$invalidate) {
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
    		if (!document.getElementById("svelte-tdi7la-style")) add_css$8();
    		init(this, options, instance$8, create_fragment$a, safe_not_equal, { variant: 0, block: 1, color: 2, class: 3 });
    	}
    }

    /* core\drawer.svelte generated by Svelte v3.29.4 */

    function add_css$9() {
    	var style = element("style");
    	style.id = "svelte-m0gj24-style";
    	style.textContent = "drawer-wrapper.svelte-m0gj24{position:absolute;top:0px;left:0px;height:100vh;min-width:5vw;background-color:var(--card-background)}";
    	append(document.head, style);
    }

    // (29:0) <Modal {open} on:close>
    function create_default_slot$1(ctx) {
    	let drawer_wrapper;
    	let drawer_wrapper_transition;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

    	return {
    		c() {
    			drawer_wrapper = element("drawer-wrapper");
    			if (default_slot) default_slot.c();
    			set_custom_element_data(drawer_wrapper, "class", "svelte-m0gj24");
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

    function create_fragment$b(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				open: /*open*/ ctx[0],
    				$$slots: { default: [create_default_slot$1] },
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

    function instance$9($$self, $$props, $$invalidate) {
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
    		if (!document.getElementById("svelte-m0gj24-style")) add_css$9();
    		init(this, options, instance$9, create_fragment$b, safe_not_equal, { open: 0 });
    	}
    }

    /* core\list.svelte generated by Svelte v3.29.4 */

    function add_css$a() {
    	var style = element("style");
    	style.id = "svelte-10jjwdp-style";
    	style.textContent = "doric-list.svelte-10jjwdp{display:flex;overflow:auto;height:var(--list-height);user-select:none;flex-direction:column}doric-list.svelte-10jjwdp>list-item, list-header{display:grid;position:relative;overflow:hidden;padding:12px 16px;color:var(--text-normal);grid-template-areas:\"start-adornment content end-adornment\"\r\n        ;grid-template-columns:auto 1fr auto}doric-list.svelte-10jjwdp>list-header > list-header-content{font-size:var(--text-size-header);font-weight:700}doric-list.svelte-10jjwdp>list-item > a{position:absolute;top:0px;left:0px;bottom:0px;right:0px;opacity:0}doric-list.svelte-10jjwdp>list-item[dividers]{border-top:1px solid var(--text-secondary);border-bottom:1px solid var(--text-secondary);margin-top:-1px}doric-list.svelte-10jjwdp>list-item > list-item-content, list-header > list-header-content{grid-area:content;display:flex;flex-direction:column;justify-content:center;align-items:stretch;grid-area:content}doric-list.svelte-10jjwdp>list-item[control]{padding:0px}";
    	append(document.head, style);
    }

    const get_default_slot_changes = dirty => ({ item: dirty & /*items*/ 1 });
    const get_default_slot_context = ctx => ({ item: /*item*/ ctx[6] });
    const get_header_slot_changes = dirty => ({ item: dirty & /*items*/ 1 });
    const get_header_slot_context = ctx => ({ item: /*item*/ ctx[6] });

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (72:8) {:else}
    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[5].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], get_default_slot_context);
    	const default_slot_or_fallback = default_slot || fallback_block_1(ctx);

    	return {
    		c() {
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    		},
    		m(target, anchor) {
    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope, items*/ 17) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, get_default_slot_changes, get_default_slot_context);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty & /*items*/ 1) {
    					default_slot_or_fallback.p(ctx, dirty);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};
    }

    // (64:8) {#if item.header !== undefined}
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

    // (73:25)                   
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

    // (65:39)                   
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

    // (63:4) {#each items as item}
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

    function create_fragment$c(ctx) {
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

    			set_custom_element_data(doric_list, "class", doric_list_class_value = "" + (null_to_empty(/*klass*/ ctx[3]) + " svelte-10jjwdp"));
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

    			if (!current || dirty & /*klass*/ 8 && doric_list_class_value !== (doric_list_class_value = "" + (null_to_empty(/*klass*/ ctx[3]) + " svelte-10jjwdp"))) {
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

    function instance$a($$self, $$props, $$invalidate) {
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
    		if (!document.getElementById("svelte-10jjwdp-style")) add_css$a();

    		init(this, options, instance$a, create_fragment$c, safe_not_equal, {
    			items: 0,
    			height: 1,
    			compact: 2,
    			class: 3
    		});
    	}
    }

    /* core\popover.svelte generated by Svelte v3.29.4 */

    function add_css$b() {
    	var style = element("style");
    	style.id = "svelte-lz0305-style";
    	style.textContent = "popover-wrapper.svelte-lz0305{position:relative;display:inline-grid}doric-popover.svelte-lz0305{position:absolute;left:var(--left);right:var(--right);top:var(--top);bottom:var(--bottom);overflow:visible;z-index:150}popover-content.svelte-lz0305{display:inline-block;position:relative;top:var(--y);left:var(--x);transform:translate(\r\n            var(--tx, 0%),\r\n            var(--ty, 0%)\r\n        );min-width:var(--width);min-height:var(--height)}";
    	append(document.head, style);
    }

    const get_content_slot_changes = dirty => ({});
    const get_content_slot_context = ctx => ({});

    // (64:4) {#if visible}
    function create_if_block$3(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				open: true,
    				clear: true,
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			}
    		});

    	modal.$on("close", /*cancel*/ ctx[3]);

    	return {
    		c() {
    			create_component(modal.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const modal_changes = {};

    			if (dirty & /*$$scope, displayVars*/ 260) {
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

    // (65:8) <Modal open clear on:close={cancel}>
    function create_default_slot$2(ctx) {
    	let doric_popover;
    	let popover_content;
    	let vars_action;
    	let current;
    	let mounted;
    	let dispose;
    	const content_slot_template = /*#slots*/ ctx[6].content;
    	const content_slot = create_slot(content_slot_template, ctx, /*$$scope*/ ctx[8], get_content_slot_context);

    	return {
    		c() {
    			doric_popover = element("doric-popover");
    			popover_content = element("popover-content");
    			if (content_slot) content_slot.c();
    			set_custom_element_data(popover_content, "class", "svelte-lz0305");
    			set_custom_element_data(doric_popover, "class", "svelte-lz0305");
    		},
    		m(target, anchor) {
    			insert(target, doric_popover, anchor);
    			append(doric_popover, popover_content);

    			if (content_slot) {
    				content_slot.m(popover_content, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = action_destroyer(vars_action = vars.call(null, doric_popover, /*displayVars*/ ctx[2]));
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (content_slot) {
    				if (content_slot.p && dirty & /*$$scope*/ 256) {
    					update_slot(content_slot, content_slot_template, ctx, /*$$scope*/ ctx[8], dirty, get_content_slot_changes, get_content_slot_context);
    				}
    			}

    			if (vars_action && is_function(vars_action.update) && dirty & /*displayVars*/ 4) vars_action.update.call(null, /*displayVars*/ ctx[2]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(content_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(content_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(doric_popover);
    			if (content_slot) content_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$d(ctx) {
    	let popover_wrapper;
    	let t;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);
    	let if_block = /*visible*/ ctx[0] && create_if_block$3(ctx);

    	return {
    		c() {
    			popover_wrapper = element("popover-wrapper");
    			if (default_slot) default_slot.c();
    			t = space();
    			if (if_block) if_block.c();
    			set_custom_element_data(popover_wrapper, "class", "svelte-lz0305");
    		},
    		m(target, anchor) {
    			insert(target, popover_wrapper, anchor);

    			if (default_slot) {
    				default_slot.m(popover_wrapper, null);
    			}

    			append(popover_wrapper, t);
    			if (if_block) if_block.m(popover_wrapper, null);
    			/*popover_wrapper_binding*/ ctx[7](popover_wrapper);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 256) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], dirty, null, null);
    				}
    			}

    			if (/*visible*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*visible*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(popover_wrapper, null);
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
    			transition_in(default_slot, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(popover_wrapper);
    			if (default_slot) default_slot.d(detaching);
    			if (if_block) if_block.d();
    			/*popover_wrapper_binding*/ ctx[7](null);
    		}
    	};
    }

    const recalc = (wrapper, visible) => {
    	if (visible === false) {
    		return {};
    	}

    	const { left, top, width, height } = wrapper.getBoundingClientRect();

    	return {
    		left: [left, "px"],
    		top: [top, "px"],
    		width: [width, "px"],
    		height: [height, "px"]
    	};
    };

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { origin = {} } = $$props;
    	let { size = {} } = $$props;
    	let { visible = false } = $$props;
    	const dispatch = createEventDispatcher();
    	const cancel = () => dispatch("cancel");
    	let wrapper = null;

    	function popover_wrapper_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			wrapper = $$value;
    			$$invalidate(1, wrapper);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("origin" in $$props) $$invalidate(4, origin = $$props.origin);
    		if ("size" in $$props) $$invalidate(5, size = $$props.size);
    		if ("visible" in $$props) $$invalidate(0, visible = $$props.visible);
    		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	let position;
    	let displayVars;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*wrapper, visible*/ 3) {
    			 $$invalidate(9, position = recalc(wrapper, visible));
    		}

    		if ($$self.$$.dirty & /*origin, size, position*/ 560) {
    			 $$invalidate(2, displayVars = { ...origin, ...size, ...position });
    		}
    	};

    	return [
    		visible,
    		wrapper,
    		displayVars,
    		cancel,
    		origin,
    		size,
    		slots,
    		popover_wrapper_binding,
    		$$scope
    	];
    }

    class Popover extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-lz0305-style")) add_css$b();
    		init(this, options, instance$b, create_fragment$d, safe_not_equal, { origin: 4, size: 5, visible: 0 });
    	}
    }

    /* core\control.svelte generated by Svelte v3.29.4 */

    function add_css$c() {
    	var style = element("style");
    	style.id = "svelte-1afrsev-style";
    	style.textContent = "control-component.svelte-1afrsev.svelte-1afrsev{display:inline-grid;position:relative;overflow:visible;z-index:0}control-content.svelte-1afrsev.svelte-1afrsev{position:relative;display:grid;grid-template-columns:min-content auto min-content;grid-template-areas:\"start-adornment control end-adornment\"\r\n        ;padding:13px 4px 4px 4px}fieldset.svelte-1afrsev.svelte-1afrsev{position:absolute;top:0px;left:0px;right:0px;bottom:0px;z-index:-1}.normal.svelte-1afrsev fieldset.svelte-1afrsev{border-radius:0px;border-width:0px;border-bottom:2px solid var(--control-border)}.outline.svelte-1afrsev fieldset.svelte-1afrsev{border:1px solid var(--control-border);border-radius:4px}.flat.svelte-1afrsev fieldset.svelte-1afrsev{border-width:0px}legend.svelte-1afrsev.svelte-1afrsev{font-size:12px;height:13px}legend.svelte-1afrsev.svelte-1afrsev:empty{padding:0px}fieldset.error.svelte-1afrsev.svelte-1afrsev{border-color:var(--control-border-error)}control-content.svelte-1afrsev>*:focus ~ fieldset:not(.error){border-color:var(--control-border-focus)}control-content.svelte-1afrsev>*:focus ~ fieldset > legend{color:var(--control-border-focus)}info-label.svelte-1afrsev.svelte-1afrsev{font-size:13px;padding-left:12px}info-label.error.svelte-1afrsev.svelte-1afrsev{color:var(--control-border-error)}";
    	append(document.head, style);
    }

    function create_fragment$e(ctx) {
    	let control_component;
    	let control_content;
    	let t0;
    	let fieldset;
    	let legend;
    	let t1;
    	let t2;
    	let info_label0;
    	let t3;
    	let t4;
    	let info_label1;
    	let t5;
    	let control_component_class_value;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

    	return {
    		c() {
    			control_component = element("control-component");
    			control_content = element("control-content");
    			if (default_slot) default_slot.c();
    			t0 = space();
    			fieldset = element("fieldset");
    			legend = element("legend");
    			t1 = text(/*label*/ ctx[1]);
    			t2 = space();
    			info_label0 = element("info-label");
    			t3 = text(/*info*/ ctx[2]);
    			t4 = space();
    			info_label1 = element("info-label");
    			t5 = text(/*error*/ ctx[0]);
    			attr(legend, "style", /*labelStyle*/ ctx[5]);
    			attr(legend, "class", "svelte-1afrsev");
    			attr(fieldset, "style", /*borderStyle*/ ctx[6]);
    			attr(fieldset, "class", "svelte-1afrsev");
    			toggle_class(fieldset, "error", /*error*/ ctx[0]);
    			set_custom_element_data(control_content, "class", "svelte-1afrsev");
    			set_custom_element_data(info_label0, "class", "svelte-1afrsev");
    			set_custom_element_data(info_label1, "class", "error svelte-1afrsev");
    			set_custom_element_data(control_component, "style", /*style*/ ctx[4]);
    			set_custom_element_data(control_component, "class", control_component_class_value = "" + (/*variant*/ ctx[3] + " " + /*klass*/ ctx[7] + " svelte-1afrsev"));
    		},
    		m(target, anchor) {
    			insert(target, control_component, anchor);
    			append(control_component, control_content);

    			if (default_slot) {
    				default_slot.m(control_content, null);
    			}

    			append(control_content, t0);
    			append(control_content, fieldset);
    			append(fieldset, legend);
    			append(legend, t1);
    			append(control_component, t2);
    			append(control_component, info_label0);
    			append(info_label0, t3);
    			append(control_component, t4);
    			append(control_component, info_label1);
    			append(info_label1, t5);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 256) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*label*/ 2) set_data(t1, /*label*/ ctx[1]);

    			if (!current || dirty & /*labelStyle*/ 32) {
    				attr(legend, "style", /*labelStyle*/ ctx[5]);
    			}

    			if (!current || dirty & /*borderStyle*/ 64) {
    				attr(fieldset, "style", /*borderStyle*/ ctx[6]);
    			}

    			if (dirty & /*error*/ 1) {
    				toggle_class(fieldset, "error", /*error*/ ctx[0]);
    			}

    			if (!current || dirty & /*info*/ 4) set_data(t3, /*info*/ ctx[2]);
    			if (!current || dirty & /*error*/ 1) set_data(t5, /*error*/ ctx[0]);

    			if (!current || dirty & /*style*/ 16) {
    				set_custom_element_data(control_component, "style", /*style*/ ctx[4]);
    			}

    			if (!current || dirty & /*variant, klass*/ 136 && control_component_class_value !== (control_component_class_value = "" + (/*variant*/ ctx[3] + " " + /*klass*/ ctx[7] + " svelte-1afrsev"))) {
    				set_custom_element_data(control_component, "class", control_component_class_value);
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
    			if (detaching) detach(control_component);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { error = "" } = $$props;
    	let { label = "" } = $$props;
    	let { info = "" } = $$props;
    	let { variant = "normal" } = $$props;
    	let { style = "" } = $$props;
    	let { labelStyle = "" } = $$props;
    	let { borderStyle = "" } = $$props;
    	let { klass = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("error" in $$props) $$invalidate(0, error = $$props.error);
    		if ("label" in $$props) $$invalidate(1, label = $$props.label);
    		if ("info" in $$props) $$invalidate(2, info = $$props.info);
    		if ("variant" in $$props) $$invalidate(3, variant = $$props.variant);
    		if ("style" in $$props) $$invalidate(4, style = $$props.style);
    		if ("labelStyle" in $$props) $$invalidate(5, labelStyle = $$props.labelStyle);
    		if ("borderStyle" in $$props) $$invalidate(6, borderStyle = $$props.borderStyle);
    		if ("klass" in $$props) $$invalidate(7, klass = $$props.klass);
    		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	return [
    		error,
    		label,
    		info,
    		variant,
    		style,
    		labelStyle,
    		borderStyle,
    		klass,
    		$$scope,
    		slots
    	];
    }

    class Control extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1afrsev-style")) add_css$c();

    		init(this, options, instance$c, create_fragment$e, safe_not_equal, {
    			error: 0,
    			label: 1,
    			info: 2,
    			variant: 3,
    			style: 4,
    			labelStyle: 5,
    			borderStyle: 6,
    			klass: 7
    		});
    	}
    }

    /* core\select.svelte generated by Svelte v3.29.4 */

    function add_css$d() {
    	var style = element("style");
    	style.id = "svelte-1esrxri-style";
    	style.textContent = "arrow-icon.svelte-1esrxri{grid-area:end-adornment;display:flex;align-items:center}tap-area.svelte-1esrxri{position:absolute;top:0px;left:0px;right:0px;bottom:0px;cursor:pointer}options-display.svelte-1esrxri{background-color:var(--background-layer);display:inline-block;max-height:20vh;min-width:100%;overflow-y:auto}selected-item-display.svelte-1esrxri{display:inline-block;padding:8px;grid-area:control;user-select:none}selected-item-display.svelte-1esrxri:focus{outline:none}list-item.svelte-1esrxri{cursor:pointer}list-item-content.svelte-1esrxri>select-label{min-width:100%}";
    	append(document.head, style);
    }

    const get_default_slot_changes$1 = dirty => ({ item: dirty & /*item*/ 8388608 });
    const get_default_slot_context$1 = ctx => ({ item: /*item*/ ctx[23] });

    const get_selected_slot_changes = dirty => ({
    	selectedItem: dirty & /*selectedItem*/ 64
    });

    const get_selected_slot_context = ctx => ({
    	selectedItem: /*selectedItem*/ ctx[6],
    	item: /*item*/ ctx[23]
    });

    // (100:49)                   
    function fallback_block_1$1(ctx) {
    	let t_value = /*selectedItem*/ ctx[6].label + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*selectedItem*/ 64 && t_value !== (t_value = /*selectedItem*/ ctx[6].label + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (98:4) <Control {...controlProps}>
    function create_default_slot_2(ctx) {
    	let selected_item_display;
    	let t;
    	let arrow_icon;
    	let icon;
    	let current;
    	let mounted;
    	let dispose;
    	const selected_slot_template = /*#slots*/ ctx[19].selected;
    	const selected_slot = create_slot(selected_slot_template, ctx, /*$$scope*/ ctx[22], get_selected_slot_context);
    	const selected_slot_or_fallback = selected_slot || fallback_block_1$1(ctx);

    	icon = new Icon({
    			props: { name: "arrow_drop_down", size: "28px" }
    		});

    	return {
    		c() {
    			selected_item_display = element("selected-item-display");
    			if (selected_slot_or_fallback) selected_slot_or_fallback.c();
    			t = space();
    			arrow_icon = element("arrow-icon");
    			create_component(icon.$$.fragment);
    			set_custom_element_data(selected_item_display, "tabindex", "0");
    			set_custom_element_data(selected_item_display, "class", "svelte-1esrxri");
    			set_custom_element_data(arrow_icon, "class", "svelte-1esrxri");
    		},
    		m(target, anchor) {
    			insert(target, selected_item_display, anchor);

    			if (selected_slot_or_fallback) {
    				selected_slot_or_fallback.m(selected_item_display, null);
    			}

    			/*selected_item_display_binding*/ ctx[20](selected_item_display);
    			insert(target, t, anchor);
    			insert(target, arrow_icon, anchor);
    			mount_component(icon, arrow_icon, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(selected_item_display, "blur", /*keep*/ ctx[10]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (selected_slot) {
    				if (selected_slot.p && dirty & /*$$scope, selectedItem*/ 4194368) {
    					update_slot(selected_slot, selected_slot_template, ctx, /*$$scope*/ ctx[22], dirty, get_selected_slot_changes, get_selected_slot_context);
    				}
    			} else {
    				if (selected_slot_or_fallback && selected_slot_or_fallback.p && dirty & /*selectedItem*/ 64) {
    					selected_slot_or_fallback.p(ctx, dirty);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(selected_slot_or_fallback, local);
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(selected_slot_or_fallback, local);
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(selected_item_display);
    			if (selected_slot_or_fallback) selected_slot_or_fallback.d(detaching);
    			/*selected_item_display_binding*/ ctx[20](null);
    			if (detaching) detach(t);
    			if (detaching) detach(arrow_icon);
    			destroy_component(icon);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (115:33)                           
    function fallback_block$1(ctx) {
    	let select_label;
    	let t_value = /*item*/ ctx[23].label + "";
    	let t;

    	return {
    		c() {
    			select_label = element("select-label");
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, select_label, anchor);
    			append(select_label, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*item*/ 8388608 && t_value !== (t_value = /*item*/ ctx[23].label + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(select_label);
    		}
    	};
    }

    // (112:8) <List let:item items={options}>
    function create_default_slot_1(ctx) {
    	let list_item;
    	let list_item_content;
    	let t;
    	let ripple;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[19].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[22], get_default_slot_context$1);
    	const default_slot_or_fallback = default_slot || fallback_block$1(ctx);
    	ripple = new Ripple({});

    	function tap_handler(...args) {
    		return /*tap_handler*/ ctx[21](/*item*/ ctx[23], ...args);
    	}

    	return {
    		c() {
    			list_item = element("list-item");
    			list_item_content = element("list-item-content");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			t = space();
    			create_component(ripple.$$.fragment);
    			set_custom_element_data(list_item_content, "class", "svelte-1esrxri");
    			set_custom_element_data(list_item, "dividers", "");
    			set_custom_element_data(list_item, "class", "svelte-1esrxri");
    		},
    		m(target, anchor) {
    			insert(target, list_item, anchor);
    			append(list_item, list_item_content);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(list_item_content, null);
    			}

    			append(list_item, t);
    			mount_component(ripple, list_item, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(list_item, "tap", tap_handler);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope, item*/ 12582912) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[22], dirty, get_default_slot_changes$1, get_default_slot_context$1);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty & /*item*/ 8388608) {
    					default_slot_or_fallback.p(ctx, dirty);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			transition_in(ripple.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			transition_out(ripple.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(list_item);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			destroy_component(ripple);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (111:4) <options-display slot="content" transition:fade={{duration: 250}}>
    function create_content_slot(ctx) {
    	let options_display;
    	let list;
    	let options_display_transition;
    	let current;

    	list = new List({
    			props: {
    				items: /*options*/ ctx[1],
    				$$slots: {
    					default: [
    						create_default_slot_1,
    						({ item }) => ({ 23: item }),
    						({ item }) => item ? 8388608 : 0
    					]
    				},
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			options_display = element("options-display");
    			create_component(list.$$.fragment);
    			set_custom_element_data(options_display, "slot", "content");
    			set_custom_element_data(options_display, "class", "svelte-1esrxri");
    		},
    		m(target, anchor) {
    			insert(target, options_display, anchor);
    			mount_component(list, options_display, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const list_changes = {};
    			if (dirty & /*options*/ 2) list_changes.items = /*options*/ ctx[1];

    			if (dirty & /*$$scope, item*/ 12582912) {
    				list_changes.$$scope = { dirty, ctx };
    			}

    			list.$set(list_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(list.$$.fragment, local);

    			add_render_callback(() => {
    				if (!options_display_transition) options_display_transition = create_bidirectional_transition(options_display, fade, { duration: 250 }, true);
    				options_display_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(list.$$.fragment, local);
    			if (!options_display_transition) options_display_transition = create_bidirectional_transition(options_display, fade, { duration: 250 }, false);
    			options_display_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(options_display);
    			destroy_component(list);
    			if (detaching && options_display_transition) options_display_transition.end();
    		}
    	};
    }

    // (97:0) <Popover {visible} {origin} {size} modal on:cancel={closeOptions}>
    function create_default_slot$3(ctx) {
    	let control;
    	let t0;
    	let tap_area;
    	let ripple;
    	let t1;
    	let current;
    	let mounted;
    	let dispose;
    	const control_spread_levels = [/*controlProps*/ ctx[5]];

    	let control_props = {
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < control_spread_levels.length; i += 1) {
    		control_props = assign(control_props, control_spread_levels[i]);
    	}

    	control = new Control({ props: control_props });
    	ripple = new Ripple({ props: { disabled: /*disabled*/ ctx[0] } });

    	return {
    		c() {
    			create_component(control.$$.fragment);
    			t0 = space();
    			tap_area = element("tap-area");
    			create_component(ripple.$$.fragment);
    			t1 = space();
    			set_custom_element_data(tap_area, "tabindex", "-1");
    			set_custom_element_data(tap_area, "class", "svelte-1esrxri");
    		},
    		m(target, anchor) {
    			mount_component(control, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, tap_area, anchor);
    			mount_component(ripple, tap_area, null);
    			insert(target, t1, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(tap_area, "tap", /*openOptions*/ ctx[8]),
    					listen(tap_area, "focus", /*focus*/ ctx[7])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			const control_changes = (dirty & /*controlProps*/ 32)
    			? get_spread_update(control_spread_levels, [get_spread_object(/*controlProps*/ ctx[5])])
    			: {};

    			if (dirty & /*$$scope, display, selectedItem*/ 4194376) {
    				control_changes.$$scope = { dirty, ctx };
    			}

    			control.$set(control_changes);
    			const ripple_changes = {};
    			if (dirty & /*disabled*/ 1) ripple_changes.disabled = /*disabled*/ ctx[0];
    			ripple.$set(ripple_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(control.$$.fragment, local);
    			transition_in(ripple.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(control.$$.fragment, local);
    			transition_out(ripple.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(control, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(tap_area);
    			destroy_component(ripple);
    			if (detaching) detach(t1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$f(ctx) {
    	let popover;
    	let current;

    	popover = new Popover({
    			props: {
    				visible: /*visible*/ ctx[4],
    				origin: /*origin*/ ctx[2],
    				size: /*size*/ ctx[11],
    				modal: true,
    				$$slots: {
    					default: [create_default_slot$3],
    					content: [create_content_slot]
    				},
    				$$scope: { ctx }
    			}
    		});

    	popover.$on("cancel", /*closeOptions*/ ctx[9]);

    	return {
    		c() {
    			create_component(popover.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(popover, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const popover_changes = {};
    			if (dirty & /*visible*/ 16) popover_changes.visible = /*visible*/ ctx[4];
    			if (dirty & /*origin*/ 4) popover_changes.origin = /*origin*/ ctx[2];

    			if (dirty & /*$$scope, options, disabled, controlProps, display, selectedItem*/ 4194411) {
    				popover_changes.$$scope = { dirty, ctx };
    			}

    			popover.$set(popover_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(popover.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(popover.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(popover, detaching);
    		}
    	};
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { label = "" } = $$props;
    	let { error = "" } = $$props;
    	let { info = "" } = $$props;
    	let { variant } = $$props;
    	let { class: klass = "" } = $$props;
    	let { value = "" } = $$props;
    	let { disabled = false } = $$props;
    	let { options = [] } = $$props;
    	let { origin = {} } = $$props;
    	let display = null;

    	const focus = () => {
    		display.focus();
    	};

    	let visible = false;
    	const openOptions = () => $$invalidate(4, visible = true);
    	const closeOptions = () => $$invalidate(4, visible = false);

    	const keep = evt => {
    		if (visible === true) {
    			evt.preventDefault();
    			evt.target.focus();
    		}
    	};

    	const size = { width: "100%" };

    	const update = item => {
    		$$invalidate(13, value = item.value);
    		closeOptions();
    	};

    	function selected_item_display_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			display = $$value;
    			$$invalidate(3, display);
    		});
    	}

    	const tap_handler = item => update(item);

    	$$self.$$set = $$props => {
    		if ("label" in $$props) $$invalidate(14, label = $$props.label);
    		if ("error" in $$props) $$invalidate(15, error = $$props.error);
    		if ("info" in $$props) $$invalidate(16, info = $$props.info);
    		if ("variant" in $$props) $$invalidate(17, variant = $$props.variant);
    		if ("class" in $$props) $$invalidate(18, klass = $$props.class);
    		if ("value" in $$props) $$invalidate(13, value = $$props.value);
    		if ("disabled" in $$props) $$invalidate(0, disabled = $$props.disabled);
    		if ("options" in $$props) $$invalidate(1, options = $$props.options);
    		if ("origin" in $$props) $$invalidate(2, origin = $$props.origin);
    		if ("$$scope" in $$props) $$invalidate(22, $$scope = $$props.$$scope);
    	};

    	let controlProps;
    	let selectedItem;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*label, info, error, variant, klass*/ 507904) {
    			 $$invalidate(5, controlProps = { label, info, error, variant, klass });
    		}

    		if ($$self.$$.dirty & /*options, value*/ 8194) {
    			 $$invalidate(6, selectedItem = options.find(item => item.value === value) ?? { label: "" });
    		}
    	};

    	return [
    		disabled,
    		options,
    		origin,
    		display,
    		visible,
    		controlProps,
    		selectedItem,
    		focus,
    		openOptions,
    		closeOptions,
    		keep,
    		size,
    		update,
    		value,
    		label,
    		error,
    		info,
    		variant,
    		klass,
    		slots,
    		selected_item_display_binding,
    		tap_handler,
    		$$scope
    	];
    }

    class Select extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1esrxri-style")) add_css$d();

    		init(this, options, instance$d, create_fragment$f, safe_not_equal, {
    			label: 14,
    			error: 15,
    			info: 16,
    			variant: 17,
    			class: 18,
    			value: 13,
    			disabled: 0,
    			options: 1,
    			origin: 2
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

    function create_fragment$g(ctx) {
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

    function instance$e($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$e, create_fragment$g, safe_not_equal, { selectedTab: 0 });
    	}
    }

    /* core\tabs\panel.svelte generated by Svelte v3.29.4 */

    function add_css$e() {
    	var style = element("style");
    	style.id = "svelte-f2qpgf-style";
    	style.textContent = "tab-panel.svelte-f2qpgf{display:none;grid-area:panel}tab-panel.active.svelte-f2qpgf{display:block}";
    	append(document.head, style);
    }

    function create_fragment$h(ctx) {
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

    function instance$f($$self, $$props, $$invalidate) {
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
    		if (!document.getElementById("svelte-f2qpgf-style")) add_css$e();
    		init(this, options, instance$f, create_fragment$h, safe_not_equal, { value: 0 });
    	}
    }

    /* core\text-input.svelte generated by Svelte v3.29.4 */

    function add_css$f() {
    	var style = element("style");
    	style.id = "svelte-17v9s3e-style";
    	style.textContent = "input.svelte-17v9s3e{font-family:var(--font);font-size:var(--text-size);grid-area:control;height:40px;box-sizing:border-box;padding:8px 4px;border-width:0px;background-color:transparent;color:var(--text-normal);min-width:24px}input.svelte-17v9s3e:focus{outline:none}";
    	append(document.head, style);
    }

    // (53:0) <Control type="text-input" {...controlProps}>
    function create_default_slot$4(ctx) {
    	let input;
    	let t;
    	let current;
    	let mounted;
    	let dispose;
    	let input_levels = [/*inputProps*/ ctx[3]];
    	let input_data = {};

    	for (let i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	const default_slot_template = /*#slots*/ ctx[12].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[18], null);

    	return {
    		c() {
    			input = element("input");
    			t = space();
    			if (default_slot) default_slot.c();
    			set_attributes(input, input_data);
    			toggle_class(input, "svelte-17v9s3e", true);
    		},
    		m(target, anchor) {
    			insert(target, input, anchor);
    			/*input_binding*/ ctx[16](input);
    			set_input_value(input, /*value*/ ctx[0]);
    			insert(target, t, anchor);

    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*input_input_handler*/ ctx[17]),
    					listen(input, "input", /*input_handler*/ ctx[13]),
    					listen(input, "focus", /*focus_handler*/ ctx[14]),
    					listen(input, "blur", /*blur_handler*/ ctx[15])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			set_attributes(input, input_data = get_spread_update(input_levels, [dirty & /*inputProps*/ 8 && /*inputProps*/ ctx[3]]));

    			if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
    				set_input_value(input, /*value*/ ctx[0]);
    			}

    			toggle_class(input, "svelte-17v9s3e", true);

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 262144) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[18], dirty, null, null);
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
    			if (detaching) detach(input);
    			/*input_binding*/ ctx[16](null);
    			if (detaching) detach(t);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$i(ctx) {
    	let control;
    	let current;
    	const control_spread_levels = [{ type: "text-input" }, /*controlProps*/ ctx[2]];

    	let control_props = {
    		$$slots: { default: [create_default_slot$4] },
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < control_spread_levels.length; i += 1) {
    		control_props = assign(control_props, control_spread_levels[i]);
    	}

    	control = new Control({ props: control_props });

    	return {
    		c() {
    			create_component(control.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(control, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const control_changes = (dirty & /*controlProps*/ 4)
    			? get_spread_update(control_spread_levels, [control_spread_levels[0], get_spread_object(/*controlProps*/ ctx[2])])
    			: {};

    			if (dirty & /*$$scope, inputProps, inputElement, value*/ 262155) {
    				control_changes.$$scope = { dirty, ctx };
    			}

    			control.$set(control_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(control.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(control.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(control, detaching);
    		}
    	};
    }

    function instance$g($$self, $$props, $$invalidate) {
    	const omit_props_names = ["label","error","info","variant","class","value","disabled","type","focus"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { label = "" } = $$props;
    	let { error = "" } = $$props;
    	let { info = "" } = $$props;
    	let { variant } = $$props;
    	let { class: klass = "" } = $$props;
    	let { value = "" } = $$props;
    	let { disabled = false } = $$props;
    	let { type = "text" } = $$props;
    	let inputElement = null;

    	function focus() {
    		inputElement.focus();
    	}

    	function input_handler(event) {
    		bubble($$self, event);
    	}

    	function focus_handler(event) {
    		bubble($$self, event);
    	}

    	function blur_handler(event) {
    		bubble($$self, event);
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			inputElement = $$value;
    			$$invalidate(1, inputElement);
    		});
    	}

    	function input_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(19, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("label" in $$new_props) $$invalidate(4, label = $$new_props.label);
    		if ("error" in $$new_props) $$invalidate(5, error = $$new_props.error);
    		if ("info" in $$new_props) $$invalidate(6, info = $$new_props.info);
    		if ("variant" in $$new_props) $$invalidate(7, variant = $$new_props.variant);
    		if ("class" in $$new_props) $$invalidate(8, klass = $$new_props.class);
    		if ("value" in $$new_props) $$invalidate(0, value = $$new_props.value);
    		if ("disabled" in $$new_props) $$invalidate(9, disabled = $$new_props.disabled);
    		if ("type" in $$new_props) $$invalidate(10, type = $$new_props.type);
    		if ("$$scope" in $$new_props) $$invalidate(18, $$scope = $$new_props.$$scope);
    	};

    	let controlProps;
    	let inputProps;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*label, info, error, variant, disabled, klass*/ 1008) {
    			 $$invalidate(2, controlProps = {
    				label,
    				info,
    				error,
    				variant,
    				disabled,
    				klass
    			});
    		}

    		 $$invalidate(3, inputProps = { type, disabled, ...$$restProps });
    	};

    	return [
    		value,
    		inputElement,
    		controlProps,
    		inputProps,
    		label,
    		error,
    		info,
    		variant,
    		klass,
    		disabled,
    		type,
    		focus,
    		slots,
    		input_handler,
    		focus_handler,
    		blur_handler,
    		input_binding,
    		input_input_handler,
    		$$scope
    	];
    }

    class Text_input extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-17v9s3e-style")) add_css$f();

    		init(this, options, instance$g, create_fragment$i, safe_not_equal, {
    			label: 4,
    			error: 5,
    			info: 6,
    			variant: 7,
    			class: 8,
    			value: 0,
    			disabled: 9,
    			type: 10,
    			focus: 11
    		});
    	}

    	get focus() {
    		return this.$$.ctx[11];
    	}
    }

    /* core\title-bar.svelte generated by Svelte v3.29.4 */

    function add_css$g() {
    	var style = element("style");
    	style.id = "svelte-1rk9s8w-style";
    	style.textContent = "doric-title-bar.svelte-1rk9s8w{position:relative;z-index:+0;height:56px;background-color:var(--title-bar-background);color:var(--title-bar-text);display:grid;grid-template-columns:min-content auto min-content;grid-template-areas:\"start-adornment title end-adornment\"\r\n        ;box-shadow:0px 2px 2px rgba(0, 0, 0, 0.25);--text-normal:var(--title-bar-text);--ripple-color:var(--ripple-dark)}doric-title-bar.sticky.svelte-1rk9s8w{position:sticky;top:0px;left:0px;right:0px;z-index:+50}doric-title-bar.svelte-1rk9s8w>title-text{grid-area:title;font-size:var(--text-size-title);display:flex;align-items:center;padding:8px;font-weight:700;user-select:none}doric-title-bar.center.svelte-1rk9s8w>title-text{justify-content:center}";
    	append(document.head, style);
    }

    function create_fragment$j(ctx) {
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

    function instance$h($$self, $$props, $$invalidate) {
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
    		if (!document.getElementById("svelte-1rk9s8w-style")) add_css$g();
    		init(this, options, instance$h, create_fragment$j, safe_not_equal, { sticky: 0, center: 1 });
    	}
    }

    /* core\theme\dark.svelte generated by Svelte v3.29.4 */

    function create_fragment$k(ctx) {
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

    function instance$i($$self) {
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
    		init(this, options, instance$i, create_fragment$k, safe_not_equal, {});
    	}
    }

    /* core\theme\light.svelte generated by Svelte v3.29.4 */

    function create_fragment$l(ctx) {
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

    function instance$j($$self) {
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
    		init(this, options, instance$j, create_fragment$l, safe_not_equal, {});
    	}
    }

    /* core\theme\tron.svelte generated by Svelte v3.29.4 */

    function create_fragment$m(ctx) {
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

    function instance$k($$self) {
    	const theme = css`
        body {
            --font: Inconsolata;
            --background: #030303;
            --background-layer: #080808;
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

    class Tron extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$k, create_fragment$m, safe_not_equal, {});
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

    function add_css$h() {
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
    function create_default_slot_2$1(ctx) {
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
    				$$slots: { default: [create_default_slot_2$1] },
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
    function create_default_slot$5(ctx) {
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

    function create_fragment$n(ctx) {
    	let card;
    	let current;

    	card = new Card({
    			props: {
    				$$slots: { default: [create_default_slot$5] },
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

    function instance$l($$self, $$props, $$invalidate) {
    	let clicked = [];
    	const buttonTypes = ["normal", "outline", "fill"];
    	const buttonColors = ["default", "primary", "secondary", "danger"];
    	const showClick = (variant, color) => evt => $$invalidate(0, clicked = [variant, color]);
    	return [clicked, buttonTypes, buttonColors, showClick];
    }

    class Button_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-qipcer-style")) add_css$h();
    		init(this, options, instance$l, create_fragment$n, safe_not_equal, {});
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
    function create_default_slot_2$2(ctx) {
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
    				$$slots: { default: [create_default_slot_2$2] },
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
    function create_default_slot$6(ctx) {
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

    function create_fragment$o(ctx) {
    	let card;
    	let current;

    	card = new Card({
    			props: {
    				$$slots: { default: [create_default_slot$6] },
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

    function instance$m($$self) {
    	const colors = ["normal", "primary", "secondary", "danger"];
    	const tap_handler = color => console.log(color);
    	const tap_handler_1 = color => console.log(color);
    	return [colors, tap_handler, tap_handler_1];
    }

    class Chip_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$m, create_fragment$o, safe_not_equal, {});
    	}
    }

    /* demo\src\app.svelte generated by Svelte v3.29.4 */

    const { document: document_1 } = globals;

    function add_css$i() {
    	var style = element("style");
    	style.id = "svelte-1lzyrmp-style";
    	style.textContent = "page-layout.svelte-1lzyrmp{display:grid;grid-template-rows:min-content auto}demo-area.svelte-1lzyrmp{display:block;width:100%;max-width:1024px;margin:auto}";
    	append(document_1.head, style);
    }

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i][0];
    	child_ctx[19] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	child_ctx[24] = i;
    	return child_ctx;
    }

    // (137:12) <Button on:tap={openMenu} fab round="40px">
    function create_default_slot_14(ctx) {
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

    // (136:8) <Adornment position="start">
    function create_default_slot_13(ctx) {
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				fab: true,
    				round: "40px",
    				$$slots: { default: [create_default_slot_14] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("tap", /*openMenu*/ ctx[9]);

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

    			if (dirty & /*$$scope*/ 134217728) {
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

    // (144:16) <div slot="selected" style="white-space: nowrap;">
    function create_selected_slot(ctx) {
    	let div;
    	let t0;
    	let t1_value = /*selectedItem*/ ctx[26].label + "";
    	let t1;

    	return {
    		c() {
    			div = element("div");
    			t0 = text("Theme: ");
    			t1 = text(t1_value);
    			attr(div, "slot", "selected");
    			set_style(div, "white-space", "nowrap");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*selectedItem*/ 67108864 && t1_value !== (t1_value = /*selectedItem*/ ctx[26].label + "")) set_data(t1, t1_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (142:8) <Adornment position="end">
    function create_default_slot_11(ctx) {
    	let select;
    	let updating_value;
    	let current;

    	function select_value_binding(value) {
    		/*select_value_binding*/ ctx[11].call(null, value);
    	}

    	let select_props = {
    		options: /*themeOptions*/ ctx[4],
    		variant: "flat",
    		$$slots: {
    			selected: [
    				create_selected_slot,
    				({ selectedItem }) => ({ 26: selectedItem }),
    				({ selectedItem }) => selectedItem ? 67108864 : 0
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*themeName*/ ctx[0] !== void 0) {
    		select_props.value = /*themeName*/ ctx[0];
    	}

    	select = new Select({ props: select_props });
    	binding_callbacks.push(() => bind(select, "value", select_value_binding));

    	return {
    		c() {
    			create_component(select.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(select, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const select_changes = {};

    			if (dirty & /*$$scope, selectedItem*/ 201326592) {
    				select_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*themeName*/ 1) {
    				updating_value = true;
    				select_changes.value = /*themeName*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			select.$set(select_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(select.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(select.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(select, detaching);
    		}
    	};
    }

    // (131:4) <TitleBar sticky>
    function create_default_slot_10(ctx) {
    	let title_text;
    	let t1;
    	let adornment0;
    	let t2;
    	let adornment1;
    	let current;

    	adornment0 = new Adornment({
    			props: {
    				position: "start",
    				$$slots: { default: [create_default_slot_13] },
    				$$scope: { ctx }
    			}
    		});

    	adornment1 = new Adornment({
    			props: {
    				position: "end",
    				$$slots: { default: [create_default_slot_11] },
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

    			if (dirty & /*$$scope*/ 134217728) {
    				adornment0_changes.$$scope = { dirty, ctx };
    			}

    			adornment0.$set(adornment0_changes);
    			const adornment1_changes = {};

    			if (dirty & /*$$scope, themeName*/ 134217729) {
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

    // (159:12) <TitleBar>
    function create_default_slot_9(ctx) {
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

    // (167:24) <Button on:tap={nav(item)}>
    function create_default_slot_8(ctx) {
    	let t_value = /*item*/ ctx[25].replace(/\b\w/g, func) + "";
    	let t;

    	return {
    		c() {
    			t = text(t_value);
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*item*/ 33554432 && t_value !== (t_value = /*item*/ ctx[25].replace(/\b\w/g, func) + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (164:12) <List items={demoList} let:item>
    function create_default_slot_7(ctx) {
    	let list_item;
    	let list_item_content;
    	let button;
    	let current;

    	button = new Button({
    			props: {
    				$$slots: { default: [create_default_slot_8] },
    				$$scope: { ctx }
    			}
    		});

    	button.$on("tap", function () {
    		if (is_function(/*nav*/ ctx[8](/*item*/ ctx[25]))) /*nav*/ ctx[8](/*item*/ ctx[25]).apply(this, arguments);
    	});

    	return {
    		c() {
    			list_item = element("list-item");
    			list_item_content = element("list-item-content");
    			create_component(button.$$.fragment);
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

    			if (dirty & /*$$scope, item*/ 167772160) {
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

    // (157:8) <Drawer bind:open on:close={closeMenu}>
    function create_default_slot_6(ctx) {
    	let div;
    	let t0;
    	let titlebar;
    	let t1;
    	let list;
    	let current;

    	titlebar = new Title_bar({
    			props: {
    				$$slots: { default: [create_default_slot_9] },
    				$$scope: { ctx }
    			}
    		});

    	list = new List({
    			props: {
    				items: /*demoList*/ ctx[7],
    				$$slots: {
    					default: [
    						create_default_slot_7,
    						({ item }) => ({ 25: item }),
    						({ item }) => item ? 33554432 : 0
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

    			if (dirty & /*$$scope*/ 134217728) {
    				titlebar_changes.$$scope = { dirty, ctx };
    			}

    			titlebar.$set(titlebar_changes);
    			const list_changes = {};

    			if (dirty & /*$$scope, item*/ 167772160) {
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

    // (182:24) <Adornment position="end">
    function create_default_slot_5$2(ctx) {
    	let select;
    	let current;
    	select = new Select({ props: { options: /*options*/ ctx[5] } });

    	return {
    		c() {
    			create_component(select.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(select, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(select.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(select.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(select, detaching);
    		}
    	};
    }

    // (181:20) <TextInput label="wat">
    function create_default_slot_4$2(ctx) {
    	let adornment;
    	let current;

    	adornment = new Adornment({
    			props: {
    				position: "end",
    				$$slots: { default: [create_default_slot_5$2] },
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

    			if (dirty & /*$$scope*/ 134217728) {
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

    // (180:16) <Card>
    function create_default_slot_3$2(ctx) {
    	let textinput;
    	let current;

    	textinput = new Text_input({
    			props: {
    				label: "wat",
    				$$slots: { default: [create_default_slot_4$2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(textinput.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(textinput, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const textinput_changes = {};

    			if (dirty & /*$$scope*/ 134217728) {
    				textinput_changes.$$scope = { dirty, ctx };
    			}

    			textinput.$set(textinput_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(textinput.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(textinput.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(textinput, detaching);
    		}
    	};
    }

    // (189:20) {#each Array.from({length: 100}) as _, i}
    function create_each_block_1$1(ctx) {
    	let div;
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(/*i*/ ctx[24]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (176:12) <TabPanel value="">
    function create_default_slot_2$3(ctx) {
    	let t0;
    	let textinput0;
    	let t1;
    	let textinput1;
    	let t2;
    	let card;
    	let t3;
    	let select;
    	let t4;
    	let div;
    	let current;
    	textinput0 = new Text_input({ props: { label: "testing" } });

    	textinput1 = new Text_input({
    			props: { label: "testing", variant: "outline" }
    		});

    	card = new Card({
    			props: {
    				$$slots: { default: [create_default_slot_3$2] },
    				$$scope: { ctx }
    			}
    		});

    	select = new Select({ props: { options: /*options*/ ctx[5] } });
    	let each_value_1 = Array.from({ length: 100 });
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	return {
    		c() {
    			t0 = text("Doric is a library of svelte components.\r\n                ");
    			create_component(textinput0.$$.fragment);
    			t1 = space();
    			create_component(textinput1.$$.fragment);
    			t2 = space();
    			create_component(card.$$.fragment);
    			t3 = space();
    			create_component(select.$$.fragment);
    			t4 = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			mount_component(textinput0, target, anchor);
    			insert(target, t1, anchor);
    			mount_component(textinput1, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(card, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(select, target, anchor);
    			insert(target, t4, anchor);
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			const card_changes = {};

    			if (dirty & /*$$scope*/ 134217728) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(textinput0.$$.fragment, local);
    			transition_in(textinput1.$$.fragment, local);
    			transition_in(card.$$.fragment, local);
    			transition_in(select.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(textinput0.$$.fragment, local);
    			transition_out(textinput1.$$.fragment, local);
    			transition_out(card.$$.fragment, local);
    			transition_out(select.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(t0);
    			destroy_component(textinput0, detaching);
    			if (detaching) detach(t1);
    			destroy_component(textinput1, detaching);
    			if (detaching) detach(t2);
    			destroy_component(card, detaching);
    			if (detaching) detach(t3);
    			destroy_component(select, detaching);
    			if (detaching) detach(t4);
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (195:16) <TabPanel value="/{demo}">
    function create_default_slot_1$3(ctx) {
    	let switch_instance;
    	let t;
    	let current;
    	var switch_value = /*component*/ ctx[19];

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
    			if (switch_value !== (switch_value = /*component*/ ctx[19])) {
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

    // (194:12) {#each Object.entries(demos) as [demo, component]}
    function create_each_block$4(ctx) {
    	let tabpanel;
    	let current;

    	tabpanel = new Panel({
    			props: {
    				value: "/" + /*demo*/ ctx[18],
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

    			if (dirty & /*$$scope*/ 134217728) {
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

    // (156:4) <Tabs bind:selectedTab>
    function create_default_slot$7(ctx) {
    	let drawer;
    	let updating_open;
    	let t0;
    	let demo_area;
    	let tabpanel;
    	let t1;
    	let current;

    	function drawer_open_binding(value) {
    		/*drawer_open_binding*/ ctx[12].call(null, value);
    	}

    	let drawer_props = {
    		$$slots: { default: [create_default_slot_6] },
    		$$scope: { ctx }
    	};

    	if (/*open*/ ctx[1] !== void 0) {
    		drawer_props.open = /*open*/ ctx[1];
    	}

    	drawer = new Drawer({ props: drawer_props });
    	binding_callbacks.push(() => bind(drawer, "open", drawer_open_binding));
    	drawer.$on("close", /*closeMenu*/ ctx[10]);

    	tabpanel = new Panel({
    			props: {
    				value: "",
    				$$slots: { default: [create_default_slot_2$3] },
    				$$scope: { ctx }
    			}
    		});

    	let each_value = Object.entries(/*demos*/ ctx[6]);
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

    			set_custom_element_data(demo_area, "class", "svelte-1lzyrmp");
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

    			if (dirty & /*$$scope*/ 134217728) {
    				drawer_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_open && dirty & /*open*/ 2) {
    				updating_open = true;
    				drawer_changes.open = /*open*/ ctx[1];
    				add_flush_callback(() => updating_open = false);
    			}

    			drawer.$set(drawer_changes);
    			const tabpanel_changes = {};

    			if (dirty & /*$$scope*/ 134217728) {
    				tabpanel_changes.$$scope = { dirty, ctx };
    			}

    			tabpanel.$set(tabpanel_changes);

    			if (dirty & /*Object, demos*/ 64) {
    				each_value = Object.entries(/*demos*/ ctx[6]);
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

    function create_fragment$p(ctx) {
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
    				$$slots: { default: [create_default_slot_10] },
    				$$scope: { ctx }
    			}
    		});

    	function tabs_selectedTab_binding(value) {
    		/*tabs_selectedTab_binding*/ ctx[13].call(null, value);
    	}

    	let tabs_props = {
    		$$slots: { default: [create_default_slot$7] },
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
    			set_custom_element_data(page_layout, "class", "svelte-1lzyrmp");
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

    			if (dirty & /*$$scope, themeName*/ 134217729) {
    				titlebar_changes.$$scope = { dirty, ctx };
    			}

    			titlebar.$set(titlebar_changes);
    			const tabs_changes = {};

    			if (dirty & /*$$scope, open*/ 134217730) {
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

    function instance$n($$self, $$props, $$invalidate) {
    	let $hash;
    	component_subscribe($$self, hashStore, $$value => $$invalidate(14, $hash = $$value));
    	let checked = JSON.parse(localStorage.themeToggle ?? "false");
    	let themeName = JSON.parse(localStorage.theme ?? `"light"`);

    	const themeOptions = [
    		{ label: "Light", value: "light" },
    		{ label: "Dark", value: "dark" },
    		{ label: "Tron", value: "tron" }
    	];

    	const themeMap = {
    		light: Light,
    		dark: Dark,
    		tron: Tron
    	};

    	// $: theme = (checked === true) ? DarkTheme : LightTheme
    	// $: theme = (checked === true) ? DarkTheme : TronTheme
    	// $: localStorage.themeToggle = JSON.stringify(checked)
    	const options = Array.from({ length: 4 }, (_, i) => ({ label: `Shoe #${i}`, value: i }));

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
    	let date = new Date();

    	function select_value_binding(value) {
    		themeName = value;
    		$$invalidate(0, themeName);
    	}

    	function drawer_open_binding(value) {
    		open = value;
    		$$invalidate(1, open);
    	}

    	function tabs_selectedTab_binding(value) {
    		selectedTab = value;
    		($$invalidate(2, selectedTab), $$invalidate(14, $hash));
    	}

    	let selectedTab;
    	let theme;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$hash*/ 16384) {
    			// const options = Array.from(
    			//     {length: 4},
    			//     (_, i) => ({
    			//         label: `Item ${i}`,
    			//         value: i
    			//     })
    			// )
    			 $$invalidate(2, selectedTab = $hash);
    		}

    		if ($$self.$$.dirty & /*themeName*/ 1) {
    			 $$invalidate(3, theme = themeMap[themeName]);
    		}

    		if ($$self.$$.dirty & /*themeName*/ 1) {
    			 localStorage.theme = JSON.stringify(themeName);
    		}

    		if ($$self.$$.dirty & /*$hash*/ 16384) {
    			 closeMenu();
    		}
    	};

    	 console.log(date);

    	return [
    		themeName,
    		open,
    		selectedTab,
    		theme,
    		themeOptions,
    		options,
    		demos,
    		demoList,
    		nav,
    		openMenu,
    		closeMenu,
    		select_value_binding,
    		drawer_open_binding,
    		tabs_selectedTab_binding
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document_1.getElementById("svelte-1lzyrmp-style")) add_css$i();
    		init(this, options, instance$n, create_fragment$p, safe_not_equal, {});
    	}
    }

    var main = new App({
        target: document.body,
    });

    return main;

}());
