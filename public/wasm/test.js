new ((function r(e) {
    var t = {};
    function n(r) {
        if (t[r])
            return t[r].exports;
        var i = t[r] = {
            i: r,
            l: !1,
            exports: {}
        };
        return e[r].call(i.exports, i, i.exports, n),
        i.l = !0,
        i.exports
    }
    n.m = e,
    n.c = t,
    n.i = function(e) {
        return e
    }
    ,
    n.d = function(e, t, r) {
        n.o(e, t) || Object.defineProperty(e, t, {
            configurable: !1,
            enumerable: !0,
            get: r
        })
    }
    ,
    n.r = function(e) {
        Object.defineProperty(e, "__esModule", {
            value: !0
        })
    }
    ,
    n.n = function(e) {
        var t = e && e.__esModule ? function() {
            return e.default
        }
        : function() {
            return e
        }
        ;
        return n.d(t, "a", t),
        t
    }
    ,
    n.o = function(e, t) {
        return Object.prototype.hasOwnProperty.call(e, t)
    }
    ,
    n.p = "/",
    n.oe = function(e) {
        throw console.error(e),
        e
    }
    ;
    var r = n(n.s = 128);
    return r.default || r
}
)({
    128: function(e, t, n) {
        "use strict";
        n.r(t);
        var r, i, o, a, s, l, u = n(2), c = n.n(u), d = n(3), h = n.n(d), f = n(9), p = function() {
            function e(t) {
                c()(this, e),
                this.decode = t,
                this.result = []
            }
            return h()(e, [{
                key: "openDecode",
                value: function() {
                    var e = this
                      , t = Module.addFunction(function(t, n, r, i, o, a, s, l, u) {
                        var c = HEAPU8.subarray(t, t + i * l)
                          , d = HEAPU8.subarray(n, n + o * l / 2)
                          , h = HEAPU8.subarray(r, r + a * l / 2)
                          , f = {
                            stride_y: i,
                            stride_u: o,
                            stride_v: a,
                            width: s,
                            height: l,
                            buf_y: new Uint8Array(c),
                            buf_u: new Uint8Array(d),
                            buf_v: new Uint8Array(h),
                            pts: u
                        };
                        e.result.push(f)
                    });
                    Module._openDecoder(t, 1)
                }
            }, {
                key: "decodeData",
                value: function(e, t) {
                    var n = e.length
                      , r = Module._malloc(n);
                    Module.HEAPU8.set(e, r),
                    Module._decodeData(r, n, t),
                    Module._free(r)
                }
            }, {
                key: "flush",
                value: function() {
                    for (Module._flushDecoder(); this.checkData(); )
                        this.decode.getDecodeYUV()
                }
            }, {
                key: "closeDecode",
                value: function() {
                    Module._closeDecoder()
                }
            }, {
                key: "getYUV",
                value: function() {
                    var e = null;
                    return this.result.length > 0 && (e = this.result.shift()),
                    e
                }
            }, {
                key: "checkData",
                value: function() {
                    return this.result.length > 0
                }
            }]),
            e
        }(), m = function() {
            function e(t) {
                c()(this, e),
                this.decode = t
            }
            return h()(e, [{
                key: "openDecode",
                value: function() {
                    return _web_decoder_open()
                }
            }, {
                key: "closeDecode",
                value: function(e) {
                    _web_decoder_close(e)
                }
            }, {
                key: "decodeData",
                value: function(e, t, n) {
                    var r = e.length || 0;
                    Module.ccall("web_decoder_decode_frame", "number", ["number", "array", "number", "number"], [n, e, r, t])
                }
            }, {
                key: "flush",
                value: function(e) {
                    var t = this.decode;
                    if (_web_decoder_decode_frame)
                        for (; !(0 > _web_decoder_decode_frame(e, null, 0, 0)) && _web_got_frame(e); )
                            t.getDecodeYUV(e)
                }
            }, {
                key: "getYUV",
                value: function(e) {
                    var t = _web_get_stride_y(e)
                      , n = _web_get_stride_u(e)
                      , r = _web_get_stride_v(e)
                      , i = _web_get_width(e)
                      , o = _web_get_height(e)
                      , a = _web_get_frame_y(e)
                      , s = _web_get_frame_u(e)
                      , l = _web_get_frame_v(e)
                      , u = parseInt(_web_got_frame_pts(e) * f.a * 1e3)
                      , c = HEAPU8.subarray(a, a + t * o)
                      , d = HEAPU8.subarray(s, s + n * o / 2)
                      , h = HEAPU8.subarray(l, l + r * o / 2);
                    return {
                        stride_y: t,
                        stride_u: n,
                        stride_v: r,
                        width: i,
                        height: o,
                        buf_y: new Uint8Array(c),
                        buf_u: new Uint8Array(d),
                        buf_v: new Uint8Array(h),
                        pts: u
                    }
                }
            }, {
                key: "checkData",
                value: function(e) {
                    return _web_got_frame(e)
                }
            }]),
            e
        }(), g = function() {
            function e() {
                c()(this, e),
                this.p = null,
                this.ptsList = [],
                this.ptsOffset = 0,
                this.fps = 0,
                this.lastDuration = 0,
                this.previousPTS = 0,
                this.status = !1,
                this.yuvArray = [],
                this.decodeTool = null
            }
            return h()(e, [{
                key: "loadWASM",
                value: function(e) {
                    var t = e.data.libPath;
                    self.Module = {
                        locateFile: function(e) {
                            return t + e
                        }
                    },
                    self.importScripts(t + "libffmpeg.js"),
                    self.Module.onRuntimeInitialized = function() {
                        console.log("wasm loaded"),
                        Module._web_decoder_open ? self.decode.decodeTool = new m(self.decode,this.event) : self.decode.decodeTool = new p(self.decode,this.event),
                        self.decode.openDecode(),
                        self.decode.onWasmLoaded()
                    }
                }
            }, {
                key: "openDecode",
                value: function() {
                    try {
                        this.status || (this.p = this.decodeTool.openDecode(),
                        this.status = !0),
                        console.log("opendecode")
                    } catch (e) {
                        console.error(e)
                    }
                }
            }, {
                key: "closeDecode",
                value: function() {
                    this.status && (this.decodeTool.closeDecode(this.p),
                    this.status = !1)
                }
            }, {
                key: "push",
                value: function(e) {
                    var t = this;
                    e.forEach(function(e) {
                        var n = e.PTS
                          , r = e.data_byte
                          , i = e.partEnd
                          , o = e.lastTS
                          , a = t.ptsList;
                        t.insertSort(a, parseInt(n * f.a * 1e3)),
                        t.decodeTool.decodeData(r, n, t.p),
                        t.decodeTool.checkData(t.p) && t.getDecodeYUV(t.p, i, o)
                    })
                }
            }, {
                key: "getDecodeYUV",
                value: function(e, t, n) {
                    if (!this.reseting) {
                        var r = 0;
                        this.fps || (this.fps = this.getFPS());
                        var i = this.decodeTool.getYUV(e)
                          , o = this.ptsList.shift();
                        i.pts = o,
                        this.previousPTS && o ? (r = parseInt(o - this.previousPTS),
                        this.lastDuration = r) : r = this.lastDuration,
                        i.duration = r,
                        i.fps = this.fps,
                        o && (this.previousPTS = o,
                        this.yuvArray.push(i),
                        this.yuvArray.length > 10 && (self.postMessage({
                            type: "decoded",
                            data: this.yuvArray
                        }),
                        this.yuvArray = [])),
                        t && (this.yuvArray.length && (self.postMessage({
                            type: "decoded",
                            data: this.yuvArray
                        }),
                        this.yuvArray = []),
                        self.postMessage({
                            type: "partEnd",
                            data: n
                        }))
                    }
                }
            }, {
                key: "reset",
                value: function() {
                    this.reseting = !0,
                    this.ptsList = [],
                    this.ptsOffset = 0,
                    this.previousPTS = 0,
                    this.fps = 0,
                    this.yuvArray = [],
                    this.closeDecode(),
                    this.openDecode(),
                    self.postMessage({
                        type: "resetEnd",
                        data: Date.now()
                    }),
                    this.reseting = !1
                }
            }, {
                key: "flush",
                value: function() {
                    this.decodeTool.flush(this.p),
                    this.yuvArray.length && (self.postMessage({
                        type: "decoded",
                        data: this.yuvArray
                    }),
                    this.yuvArray = []),
                    this.closeDecode(),
                    self.postMessage({
                        type: "flushEnd",
                        data: this.previousPTS
                    })
                }
            }, {
                key: "getFPS",
                value: function() {
                    var e = this.ptsList;
                    return e.length >= 2 ? Math.round(1e3 / (e[1] - e[0])) : null
                }
            }, {
                key: "onWasmLoaded",
                value: function() {
                    self.postMessage({
                        type: "dataProcessorReady"
                    })
                }
            }, {
                key: "insertSort",
                value: function(e, t) {
                    var n = e.length;
                    if (0 !== n) {
                        for (var r = 0; r < n; r++)
                            if (t < e[r]) {
                                for (var i = n; i > r; )
                                    e[i] = e[i - 1],
                                    i--;
                                return void (e[r] = t)
                            }
                        e.push(t)
                    } else
                        e.push(t)
                }
            }]),
            e
        }(), y = n(0), b = n.n(y);
        function w(e, t, n) {
            return (w = "u" > typeof Reflect && Reflect.get ? Reflect.get : function(e, t, n) {
                var r = function(e, t) {
                    for (; !Object.prototype.hasOwnProperty.call(e, t) && null !== (e = T(e)); )
                        ;
                    return e
                }(e, t);
                if (r) {
                    var i = Object.getOwnPropertyDescriptor(r, t);
                    return i.get ? i.get.call(n) : i.value
                }
            }
            )(e, t, n || e)
        }
        function _(e) {
            return function(e) {
                if (Array.isArray(e)) {
                    for (var t = 0, n = Array(e.length); t < e.length; t++)
                        n[t] = e[t];
                    return n
                }
            }(e) || function(e) {
                if (Symbol.iterator in Object(e) || "[object Arguments]" === Object.prototype.toString.call(e))
                    return Array.from(e)
            }(e) || function() {
                throw TypeError("Invalid attempt to spread non-iterable instance")
            }()
        }
        function x(e) {
            return (x = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e) {
                return typeof e
            }
            : function(e) {
                return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e
            }
            )(e)
        }
        function k(e, t) {
            return t && ("object" === x(t) || "function" == typeof t) ? t : S(e)
        }
        function S(e) {
            if (void 0 === e)
                throw ReferenceError("this hasn't been initialised - super() hasn't been called");
            return e
        }
        function C(e, t) {
            if ("function" != typeof t && null !== t)
                throw TypeError("Super expression must either be null or a function");
            e.prototype = Object.create(t && t.prototype, {
                constructor: {
                    value: e,
                    writable: !0,
                    configurable: !0
                }
            }),
            t && P(e, t)
        }
        function M(e) {
            var t = "function" == typeof Map ? new Map : void 0;
            return (M = function(e) {
                var n;
                if (null === e || (n = e,
                -1 === Function.toString.call(n).indexOf("[native code]")))
                    return e;
                if ("function" != typeof e)
                    throw TypeError("Super expression must either be null or a function");
                if (void 0 !== t) {
                    if (t.has(e))
                        return t.get(e);
                    t.set(e, r)
                }
                function r() {
                    return E(e, arguments, T(this).constructor)
                }
                return r.prototype = Object.create(e.prototype, {
                    constructor: {
                        value: r,
                        enumerable: !1,
                        writable: !0,
                        configurable: !0
                    }
                }),
                P(r, e)
            }
            )(e)
        }
        function A() {
            if ("u" < typeof Reflect || !Reflect.construct || Reflect.construct.sham)
                return !1;
            if ("function" == typeof Proxy)
                return !0;
            try {
                return Date.prototype.toString.call(Reflect.construct(Date, [], function() {})),
                !0
            } catch (e) {
                return !1
            }
        }
        function E(e, t, n) {
            return (E = A() ? Reflect.construct : function(e, t, n) {
                var r = [null];
                r.push.apply(r, t);
                var i = new (Function.bind.apply(e, r));
                return n && P(i, n.prototype),
                i
            }
            ).apply(null, arguments)
        }
        function P(e, t) {
            return (P = Object.setPrototypeOf || function(e, t) {
                return e.__proto__ = t,
                e
            }
            )(e, t)
        }
        function T(e) {
            return (T = Object.setPrototypeOf ? Object.getPrototypeOf : function(e) {
                return e.__proto__ || Object.getPrototypeOf(e)
            }
            )(e)
        }
        function I(e, t) {
            if (!(e instanceof t))
                throw TypeError("Cannot call a class as a function")
        }
        function O(e, t) {
            for (var n = 0; n < t.length; n++) {
                var r = t[n];
                r.enumerable = r.enumerable || !1,
                r.configurable = !0,
                "value"in r && (r.writable = !0),
                Object.defineProperty(e, r.key, r)
            }
        }
        function D(e, t, n) {
            return t && O(e.prototype, t),
            n && O(e, n),
            e
        }
        !function(e) {
            e.ERROR = "ERROR",
            e.INFO = "INFO",
            e.DATA = "DATA",
            e.DEMUX_DATA = "DEMUX_DATA",
            e.DONE = "DONE"
        }(l || (l = {}));
        var j, N = Object.create || function(e) {
            var t = function() {};
            return t.prototype = e,
            new t
        }
        , L = Object.keys || function(e) {
            for (var t in e)
                Object.prototype.hasOwnProperty.call(e, t);
            return t
        }
        , R = Function.prototype.bind || function(e) {
            var t = this;
            return function() {
                return t.apply(e, arguments)
            }
        }
        , B = 10, z = function() {
            function e() {
                I(this, e),
                this._events && Object.prototype.hasOwnProperty.call(this, "_events") || (this._events = N(null),
                this._eventsCount = 0),
                this._maxListeners = this._maxListeners || void 0
            }
            return D(e, [{
                key: "emit",
                value: function(e) {
                    for (var t = arguments.length, n = Array(t > 1 ? t - 1 : 0), r = 1; r < t; r++)
                        n[r - 1] = arguments[r];
                    var i, o, a, s, l, u, c = "error" === e;
                    if (u = this._events)
                        c = c && null == u.error;
                    else if (!c)
                        return !1;
                    if (c) {
                        if (arguments.length > 1 && (i = arguments[1]),
                        i instanceof Error)
                            throw i;
                        var d = Error('Unhandled "error" event. (' + i + ")");
                        throw d.context = i,
                        d
                    }
                    if (!(o = u[e]))
                        return !1;
                    var h = "function" == typeof o;
                    switch (a = arguments.length) {
                    case 1:
                        F(o, h, this);
                        break;
                    case 2:
                        H(o, h, this, arguments[1]);
                        break;
                    case 3:
                        V(o, h, this, arguments[1], arguments[2]);
                        break;
                    case 4:
                        U(o, h, this, arguments[1], arguments[2], arguments[3]);
                        break;
                    default:
                        for (s = Array(a - 1),
                        l = 1; l < a; l++)
                            s[l - 1] = arguments[l];
                        q(o, h, this, s)
                    }
                    return !0
                }
            }, {
                key: "on",
                value: function(t, n) {
                    return function(t, n, r) {
                        var i, o, a;
                        if ("function" != typeof r)
                            throw TypeError('"listener" argument must be a function');
                        if ((o = t._events) ? (o.newListener && (t.emit("newListener", n, r.listener ? r.listener : r),
                        o = t._events),
                        a = o[n]) : (o = t._events = N(null),
                        t._eventsCount = 0),
                        a) {
                            if ("function" == typeof a ? a = o[n] = [a, r] : a.push(r),
                            !a.warned && (i = function(t) {
                                return void 0 === t._maxListeners ? e.defaultMaxListeners : t._maxListeners
                            }(t)) && i > 0 && a.length > i) {
                                a.warned = !0;
                                var s = new (function(e) {
                                    function t() {
                                        return I(this, t),
                                        k(this, T(t).apply(this, arguments))
                                    }
                                    return C(t, e),
                                    t
                                }(M(Error)))("Possible Dispatcher memory leak detected. " + a.length + ' "' + String(n) + '" listeners added. Use emitter.setMaxListeners() to increase limit.');
                                s.name = "MaxListenersExceededWarning",
                                s.emitter = t,
                                s.type = n,
                                s.count = a.length,
                                "object" === ("u" < typeof console ? "undefined" : x(console)) && console.warn && console.warn("%s: %s", s.name, s.message)
                            }
                        } else
                            a = o[n] = r,
                            ++t._eventsCount;
                        return t
                    }(this, t, n)
                }
            }, {
                key: "once",
                value: function(e, t) {
                    if ("function" != typeof t)
                        throw TypeError('"listener" argument must be a function');
                    return this.on(e, function(e, t, n) {
                        var r = {
                            fired: !1,
                            wrapFn: void 0,
                            target: e,
                            type: t,
                            listener: n
                        }
                          , i = R.call(X, r);
                        return i.listener = n,
                        r.wrapFn = i,
                        i
                    }(this, e, t)),
                    this
                }
            }, {
                key: "off",
                value: function(e, t) {
                    return G.call(this, e, t)
                }
            }, {
                key: "removeAllListeners",
                value: function(e) {
                    var t, n, r;
                    if (!(n = this._events))
                        return this;
                    if (!n.off)
                        return 0 == arguments.length ? (this._events = N(null),
                        this._eventsCount = 0) : n[e] && (0 == --this._eventsCount ? this._events = N(null) : delete n[e]),
                        this;
                    if (0 == arguments.length) {
                        var i, o = L(n);
                        for (r = 0; r < o.length; ++r)
                            "off" !== (i = o[r]) && this.removeAllListeners(i);
                        return this.removeAllListeners("off"),
                        this._events = N(null),
                        this._eventsCount = 0,
                        this
                    }
                    if ("function" == typeof (t = n[e]))
                        this.off(e, t);
                    else if (t)
                        for (r = t.length - 1; r >= 0; r--)
                            this.off(e, t[r]);
                    return this
                }
            }, {
                key: "listeners",
                value: function(e) {
                    return $(this, e, !0)
                }
            }, {
                key: "rawListeners",
                value: function(e) {
                    return $(this, e, !1)
                }
            }, {
                key: "listenerCount",
                value: function() {
                    return e.listenerCount.apply(this, arguments)
                }
            }], [{
                key: "listenerCount",
                value: function(e, t) {
                    return "function" == typeof e.listenerCount ? e.listenerCount(t) : Y.call(e, t)
                }
            }]),
            e
        }();
        try {
            var W = {};
            Object.defineProperty && Object.defineProperty(W, "x", {
                value: 0
            }),
            j = 0 === W.x
        } catch (e) {
            j = !1
        }
        function F(e, t, n) {
            if (t)
                e.call(n);
            else
                for (var r = e.length, i = K(e, r), o = 0; o < r; ++o)
                    try {
                        i[o].call(n)
                    } catch (e) {
                        console.error(e)
                    }
        }
        function H(e, t, n, r) {
            if (t)
                e.call(n, r);
            else
                for (var i = e.length, o = K(e, i), a = 0; a < i; ++a)
                    try {
                        o[a].call(n, r)
                    } catch (e) {
                        console.error(e)
                    }
        }
        function V(e, t, n, r, i) {
            if (t)
                e.call(n, r, i);
            else
                for (var o = e.length, a = K(e, o), s = 0; s < o; ++s)
                    try {
                        a[s].call(n, r, i)
                    } catch (e) {
                        console.error(e)
                    }
        }
        function U(e, t, n, r, i, o) {
            if (t)
                e.call(n, r, i, o);
            else
                for (var a = e.length, s = K(e, a), l = 0; l < a; ++l)
                    try {
                        s[l].call(n, r, i, o)
                    } catch (e) {
                        console.error(e)
                    }
        }
        function q(e, t, n, r) {
            if (t)
                e.apply(n, r);
            else
                for (var i = e.length, o = K(e, i), a = 0; a < i; ++a)
                    try {
                        o[a].apply(n, r)
                    } catch (e) {
                        console.error(e)
                    }
        }
        function G(e, t) {
            var n, r, i, o, a;
            if ("function" != typeof t)
                throw TypeError('"listener" argument must be a function');
            if (!(r = this._events) || !(n = r[e]))
                return this;
            if (n === t || n.listener === t)
                0 == --this._eventsCount ? this._events = N(null) : (delete r[e],
                r.off && this.emit("off", e, n.listener || t));
            else if ("function" != typeof n) {
                for (i = -1,
                o = n.length - 1; o >= 0; o--)
                    if (n[o] === t || n[o].listener === t) {
                        a = n[o].listener,
                        i = o;
                        break
                    }
                if (i < 0)
                    return this;
                0 === i ? n.shift() : function(e, t) {
                    for (var n = t, r = n + 1, i = e.length; r < i; n += 1,
                    r += 1)
                        e[n] = e[r];
                    e.pop()
                }(n, i),
                1 === n.length && (r[e] = n[0]),
                r.off && this.emit("off", e, a || t)
            }
            return this
        }
        function X() {
            if (!this.fired)
                switch (this.target.off(this.type, this.wrapFn),
                this.fired = !0,
                arguments.length) {
                case 0:
                    return this.listener.call(this.target);
                case 1:
                    return this.listener.call(this.target, arguments[0]);
                case 2:
                    return this.listener.call(this.target, arguments[0], arguments[1]);
                case 3:
                    return this.listener.call(this.target, arguments[0], arguments[1], arguments[2]);
                default:
                    for (var e = Array(arguments.length), t = 0; t < e.length; ++t)
                        e[t] = arguments[t];
                    this.listener.apply(this.target, e)
                }
        }
        function $(e, t, n) {
            var r = e._events;
            if (!r)
                return [];
            var i = r[t];
            return i ? "function" == typeof i ? n ? [i.listener || i] : [i] : n ? function(e) {
                for (var t = Array(e.length), n = 0; n < t.length; ++n)
                    t[n] = e[n].listener || e[n];
                return t
            }(i) : K(i, i.length) : []
        }
        function Y(e) {
            var t = this._events;
            if (t) {
                var n = t[e];
                if ("function" == typeof n)
                    return 1;
                if (n)
                    return n.length
            }
            return 0
        }
        function K(e, t) {
            for (var n = Array(t), r = 0; r < t; ++r)
                n[r] = e[r];
            return n
        }
        j ? Object.defineProperty(z, "defaultMaxListeners", {
            enumerable: !0,
            get: function() {
                return B
            },
            set: function(e) {
                if ("number" != typeof e || e < 0 || e != e)
                    throw TypeError('"defaultMaxListeners" must be a positive number');
                B = e
            }
        }) : z.defaultMaxListeners = B;
        var Z = function(e) {
            function t() {
                return I(this, t),
                k(this, T(t).apply(this, arguments))
            }
            return C(t, e),
            t
        }(z)
          , J = Object.prototype.toString;
        function Q(e) {
            return !!e && "object" == x(e)
        }
        function ee(e) {
            return "number" == typeof e && !isNaN(e)
        }
        function et(e) {
            return Q(e) && "[object arraybuffer]" === J.call(e).toLowerCase()
        }
        var en, er = function() {
            function e() {
                I(this, e),
                this.list_ = []
            }
            return D(e, [{
                key: "clear",
                value: function() {
                    var e = this.list_.length;
                    e > 0 && this.list_.splice(0, e),
                    this.byteLength_ = null
                }
            }, {
                key: "toNewBytes",
                value: function() {
                    for (var e = null, t = 0; null === e; )
                        try {
                            t++,
                            e = new Uint8Array(this.byteLength)
                        } catch (e) {
                            if (t > 50)
                                throw e
                        }
                    for (var n = 0, r = 0; n < this.list_.length; n++) {
                        var i = this.list_[n];
                        e.set(i, r),
                        r += i.byteLength
                    }
                    return e
                }
            }, {
                key: "append",
                value: function(t) {
                    t instanceof e ? this.list_ = this.list_.concat(t.bufferList) : this.list_.push(t),
                    this.byteLength_ = null
                }
            }, {
                key: "cut",
                value: function(e) {
                    var t = !(arguments.length > 1 && void 0 !== arguments[1]) || arguments[1]
                      , n = null;
                    if (e > 0 && !this.empty) {
                        for (var r = this.list_, i = 0, o = 0; r.length > 0; ) {
                            var a = r.shift();
                            if (0 !== o) {
                                var s = e - i;
                                if (a.byteLength >= s) {
                                    t && n.set(a.subarray(0, s), i),
                                    (a = a.subarray(s)).byteLength > 0 && r.unshift(a);
                                    break
                                }
                                t && n.set(a, i),
                                i += a.byteLength;
                                break
                            }
                            if (a.byteLength >= e) {
                                t && (n = a.subarray(0, e)),
                                a.byteLength > e && (a = a.subarray(e),
                                r.unshift(a));
                                break
                            }
                            if (t) {
                                try {
                                    n = new Uint8Array(e)
                                } catch (t) {
                                    throw "alloc_memory_error@ cache buffer: ".concat(e, " ").concat(t.message)
                                }
                                n.set(a, 0)
                            }
                            i += a.byteLength,
                            o++
                        }
                        this.byteLength_ = null
                    }
                    return n
                }
            }, {
                key: "byteLength",
                get: function() {
                    if (!ee(this.byteLength_)) {
                        for (var e = 0, t = 0; t < this.list_.length; t++)
                            e += this.list_[t].byteLength;
                        this.byteLength_ = e
                    }
                    return this.byteLength_
                }
            }, {
                key: "bytes",
                get: function() {
                    var e = this.bufferList
                      , t = null;
                    return e.length > 0 && (t = 0 === e.length ? e[0] : this.toNewBytes()),
                    t
                }
            }, {
                key: "empty",
                get: function() {
                    return 0 === this.list_.length
                }
            }, {
                key: "bufferList",
                get: function() {
                    return this.list_
                }
            }]),
            e
        }(), ei = function() {
            function e() {
                I(this, e),
                this.map_ = {}
            }
            return D(e, [{
                key: "push",
                value: function(e, t) {
                    Object.prototype.hasOwnProperty.call(this.map_, e) ? this.map_[e].push(t) : this.map_[e] = [t]
                }
            }, {
                key: "get",
                value: function(e) {
                    var t = this.map_[e];
                    return t ? t.slice() : null
                }
            }, {
                key: "getAll",
                value: function() {
                    var e = [];
                    for (var t in this.map_)
                        e.push.apply(e, this.map_[t]);
                    return e
                }
            }, {
                key: "remove",
                value: function(e, t) {
                    var n = this.map_[e];
                    if (n)
                        for (var r = 0; r < n.length; ++r)
                            n[r] == t && (n.splice(r, 1),
                            --r)
                }
            }, {
                key: "clear",
                value: function() {
                    this.map_ = {}
                }
            }, {
                key: "forEach",
                value: function(e) {
                    for (var t in this.map_)
                        e(t, this.map_[t])
                }
            }]),
            e
        }(), eo = function() {
            function e(t, n, r) {
                I(this, e),
                this.target = t,
                this.type = n,
                this.listener = r,
                this.target.addEventListener ? this.target.addEventListener(n, r, !1) : this.target.on && this.target.on(n, r, !1)
            }
            return D(e, [{
                key: "off",
                value: function() {
                    this.target.removeEventListener ? this.target.removeEventListener(this.type, this.listener, !1) : this.target.off && this.target.off(this.type, this.listener, !1),
                    this.target = null,
                    this.listener = null
                }
            }]),
            e
        }(), ea = function() {
            function e() {
                I(this, e),
                this.bindingMap_ = new ei
            }
            return D(e, [{
                key: "destroy",
                value: function() {
                    this.removeAll(),
                    this.bindingMap_ = null
                }
            }, {
                key: "on",
                value: function(e, t, n) {
                    if (this.bindingMap_) {
                        var r = new eo(e,t,n);
                        return this.bindingMap_.push(t, r),
                        this
                    }
                }
            }, {
                key: "once",
                value: function(e, t, n) {
                    this.on(e, t, (function(r) {
                        this.off(e, t),
                        n(r)
                    }
                    ).bind(this))
                }
            }, {
                key: "off",
                value: function(e, t) {
                    if (this.bindingMap_)
                        for (var n = this.bindingMap_.get(t) || [], r = 0; r < n.length; ++r) {
                            var i = n[r];
                            i.target == e && (i.off(),
                            this.bindingMap_.remove(t, i))
                        }
                }
            }, {
                key: "removeAll",
                value: function() {
                    if (this.bindingMap_) {
                        for (var e = this.bindingMap_.getAll(), t = 0; t < e.length; ++t)
                            e[t].off();
                        this.bindingMap_.clear()
                    }
                }
            }]),
            e
        }(), es = ("u" < typeof window ? self : window).console, el = "u" > typeof WorkerGlobalScope && self instanceof WorkerGlobalScope && "u" > typeof importScripts, eu = ">>>", ec = new (function(e) {
            function t() {
                var e;
                return I(this, t),
                (e = k(this, T(t).call(this)))._enable = !1,
                e
            }
            return C(t, e),
            D(t, [{
                key: "log",
                value: function() {
                    for (var e, t = arguments.length, n = Array(t), r = 0; r < t; r++)
                        n[r] = arguments[r];
                    el ? ec.emit(this.MSG_NAME, "log", [].concat(n).join("")) : this._enable && (e = es.log).call.apply(e, [es, eu].concat(n))
                }
            }, {
                key: "debug",
                value: function() {
                    for (var e, t = arguments.length, n = Array(t), r = 0; r < t; r++)
                        n[r] = arguments[r];
                    el ? ec.emit(this.MSG_NAME, "debug", [].concat(n).join("")) : this._enable && es.debug && (e = es.debug).call.apply(e, [es, eu].concat(n))
                }
            }, {
                key: "assert",
                value: function() {
                    if (this._enable && es.assert) {
                        for (var e, t = arguments.length, n = Array(t), r = 0; r < t; r++)
                            n[r] = arguments[r];
                        var i = n[0]
                          , o = Array.prototype.slice.call(n, 1);
                        o.unshift(eu),
                        (e = es.assert).call.apply(e, [es, i].concat(_(o)))
                    }
                }
            }, {
                key: "warn",
                value: function() {
                    for (var e, t = arguments.length, n = Array(t), r = 0; r < t; r++)
                        n[r] = arguments[r];
                    el ? ec.emit(this.MSG_NAME, "warn", [].concat(n).join("")) : this._enable && (e = es.warn).call.apply(e, [es, eu].concat(n))
                }
            }, {
                key: "error",
                value: function() {
                    for (var e, t = arguments.length, n = Array(t), r = 0; r < t; r++)
                        n[r] = arguments[r];
                    el ? ec.emit(this.MSG_NAME, "error", [].concat(n).join("")) : this._enable && (e = es.error).call.apply(e, [es, eu].concat(n))
                }
            }, {
                key: "enable",
                get: function() {
                    return this._enable
                },
                set: function(e) {
                    this._enable = e,
                    this.MSG_NAME = "__log__"
                }
            }]),
            t
        }(z)), ed = function(e) {
            function t() {
                return I(this, t),
                k(this, T(t).call(this))
            }
            return C(t, e),
            D(t, [{
                key: "pipe",
                value: function(e) {
                    return this.on("reset", function() {
                        e.reset()
                    }),
                    this.on("data", function(t) {
                        e.push(t)
                    }),
                    this.on("done", function(t) {
                        e.flush(t)
                    }),
                    e
                }
            }, {
                key: "unpipe",
                value: function() {
                    return this.removeAllListeners("reset"),
                    this.removeAllListeners("data"),
                    this.removeAllListeners("done"),
                    this
                }
            }, {
                key: "push",
                value: function(e, t) {
                    this.emit("data", e)
                }
            }, {
                key: "flush",
                value: function(e) {
                    this.emit("done", e)
                }
            }, {
                key: "reset",
                value: function() {
                    this.emit("reset")
                }
            }]),
            t
        }(z), eh = function(e) {
            function t() {
                var e, n = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
                return I(this, t),
                e = k(this, T(t).call(this)),
                n.debug && (ec.enable = !0),
                e.ctx_ = new Z,
                e.options_ = n,
                e.cache_buffer_ = new er,
                e
            }
            return C(t, e),
            D(t, [{
                key: "listenEndStream_",
                value: function() {
                    var e = this;
                    this.eventManager_ = new ea,
                    this.eventManager_.on(this.endStream, "data", function(t) {
                        e.emit(l.DEMUX_DATA, t)
                    }).on(this.endStream, "done", function(t) {
                        e.emit(l.DONE, t)
                    }).on(this.ctx_, "error", function(t) {
                        e.emit(l.ERROR, t)
                    })
                }
            }, {
                key: "constraintPushData_",
                value: function(e) {
                    var t, n = null;
                    return et(e) || Q(t = e) && "[object uint8array]" === J.call(t).toLowerCase() ? n = et(e) ? new Uint8Array(e) : e : (ec.error("Data pushed is not an ArrayBuffer or Uint8Array: ".concat(e)),
                    n)
                }
            }, {
                key: "reset",
                value: function() {}
            }, {
                key: "destroy",
                value: function() {
                    this.unpipe(),
                    this.endStream.unpipe(),
                    this.eventManager_.removeAll()
                }
            }]),
            t
        }(ed);
        !function(e) {
            e[e.WORKER_EXCEPTION = 0] = "WORKER_EXCEPTION",
            e[e.WORKER_MSG_EXCEPTION = 1] = "WORKER_MSG_EXCEPTION",
            e[e.TS_SYNC_BYTE = 2] = "TS_SYNC_BYTE",
            e[e.FLV_HEAD_SIGNATURE = 3] = "FLV_HEAD_SIGNATURE",
            e[e.FLV_NOT_EXPECTED_ADJACENT_DATA = 4] = "FLV_NOT_EXPECTED_ADJACENT_DATA"
        }(en || (en = {}));
        var ef = en;
        function ep(e) {
            var t = 0;
            return ArrayBuffer.isView(e) && (t = e.byteOffset,
            e = e.buffer),
            new DataView(e,t)
        }
        var em = function() {
            function e() {
                I(this, e)
            }
            return D(e, [{
                key: "readUint8",
                value: function(e, t) {
                    return ep(e).getUint8(t)
                }
            }, {
                key: "readUint16",
                value: function(e, t) {
                    var n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
                    return ep(e).getUint16(t, n)
                }
            }, {
                key: "readUint32",
                value: function(e, t) {
                    var n = arguments.length > 2 && void 0 !== arguments[2] && arguments[2];
                    return ep(e).getUint32(t, n)
                }
            }]),
            e
        }()
          , eg = function(e) {
            function t(e) {
                I(this, t),
                (n = k(this, T(t).call(this))).table_id = e[0],
                n.section_syntax_indicator = e[1] >> 7,
                n.section_length = (15 & e[1]) << 8 | e[2],
                n.transport_stream_id = n.readUint16(e, 3),
                n.version_number = e[5] >> 1 & 31,
                n.current_next_indicator = e[5] && 1,
                n.section_number = e[6],
                n.last_section_number = e[7],
                n.network_PID = 0;
                var n, r, i = 0, o = n.section_length - 4 - 5;
                for (n.pmtTable = []; i < o; i += 4)
                    0 == (r = n.readUint16(e, 8 + i)) ? (n.network_PID = (31 & e[10 + i]) << 8 | e[11 + i],
                    ec.log("packet->network_PID %0x /n/n", n.network_PID)) : n.pmtTable.push({
                        programNum: r,
                        program_map_PID: (31 & e[10 + i]) << 8 | e[11 + i]
                    });
                var a = n.section_length + 3;
                return n.CRC_32 = (255 & e[a - 4]) << 24 | (255 & e[a - 3]) << 16 | (255 & e[a - 2]) << 8 | 255 & e[a - 1],
                n
            }
            return C(t, e),
            t
        }(em)
          , ey = function(e) {
            function t(e) {
                if (I(this, t),
                (n = k(this, T(t).call(this))).table_id = e[0],
                n.section_syntax_indicator = e[1] >> 7,
                n.section_length = (15 & e[1]) << 8 | e[2],
                n.program_number = n.readUint16(e, 3),
                n.version_number = e[5] >> 1 & 31,
                n.current_next_indicator = e[5] && 1,
                n.section_number = e[6],
                n.last_section_number = e[7],
                n.PCR_PID = (31 & e[8]) << 8 | e[9],
                n.program_info_length = (15 & e[10]) << 8 | e[11],
                n.program_info_length < 0)
                    return k(n);
                if (n.program_info_length > 2)
                    for (var n, r = 0; r < n.program_info_length; )
                        r += e[13 + r];
                var i = 12 + n.program_info_length
                  , o = n.section_length - n.program_info_length - 9 - 4
                  , a = i + o;
                if (i >= a)
                    return ec.warn("es_section_pos < es_section_end ".concat(i, ", ").concat(a)),
                    k(n);
                n.pes_table = [];
                for (var s = 0; s < o; ) {
                    var l = e[i + s]
                      , u = 8191 & n.readUint16(e, i + s + 1)
                      , c = 4095 & n.readUint16(e, i + s + 3);
                    if (n.pes_table.push({
                        streamType: l,
                        PID: u
                    }),
                    c > 2)
                        for (var d = 0, h = i + s + 5; d < c; )
                            d += e[h + d];
                    s += c + 5
                }
                var f = n.section_length + 3;
                return n.CRC_32 = (255 & e[f - 4]) << 24 | (255 & e[f - 3]) << 16 | (255 & e[f - 2]) << 8 | 255 & e[f - 1],
                n
            }
            return C(t, e),
            D(t, [{
                key: "parse",
                value: function() {}
            }]),
            t
        }(em)
          , ev = function(e) {
            function t(e) {
                I(this, t),
                (n = k(this, T(t).call(this))).table_id = e[0],
                n.section_syntax_indicator = e[1] >> 7,
                n.section_length = (15 & e[1]) << 8 | e[2],
                n.transport_stream_id = n.readUint16(e, 3),
                n.version_number = e[5] >> 1 & 31,
                n.current_next_indicator = 1 & e[5],
                n.section_number = e[6],
                n.last_section_number = e[7],
                n.original_network_id = n.readUint16(e, 8);
                var n, r = n.section_length - 8 - 4;
                n.service_table = [];
                for (var i = 0; i < r; ) {
                    for (var o = 0, a = {
                        service_id: n.readUint16(e, 11),
                        EIT_schedule_flag: 2 & e[13],
                        EIT_present_following_flag: 1 & e[13],
                        running_status: e[14] >> 5,
                        free_CA_mode: e[14] >> 4 & 1,
                        descriptors_loop_length: (15 & e[14]) << 8 | e[15],
                        provider_name: "",
                        name: ""
                    }; o < a.descriptors_loop_length; ) {
                        var s = 16 + o
                          , l = e[s]
                          , u = e[s + 1];
                        if (72 === l) {
                            var c = []
                              , d = e[s + 3]
                              , h = 0
                              , f = 0
                              , p = s + 4;
                            for (h = 0; h < d; h++)
                                c.push(String.fromCharCode(e[p])),
                                p += 1;
                            a.provider_name = c.join("");
                            var m = []
                              , g = e[p];
                            for (p += 1,
                            f = 0; f < g; f++)
                                m.push(String.fromCharCode(e[p])),
                                p += 1;
                            a.name = m.join("")
                        } else
                            ec.warn("sdt section unhandled descriptor_tag ".concat(l));
                        o += 2 + u
                    }
                    n.service_table.push(a),
                    i += 5 + a.descriptors_loop_length
                }
                return n
            }
            return C(t, e),
            t
        }(em)
          , eb = function e() {
            I(this, e)
        }
          , ew = function() {
            function e(t) {
                I(this, e),
                this.context = t,
                this.metadata = new eb,
                this.pat_table = [],
                this.pes_streams = []
            }
            return D(e, [{
                key: "reset",
                value: function() {
                    this.metadata = new eb,
                    this.pat_table.splice(0, this.pat_table.length),
                    this.pes_streams.splice(0, this.pes_streams.length)
                }
            }, {
                key: "parse",
                value: function(e) {
                    0 === e.PID ? this._parsePat(e) : 1 === e.PID || 2 === e.PID || 3 <= e.PID && e.PID <= 15 || (17 === e.PID ? this._parseSdt(e) : e.PID === this.currentProgramPID && this._parsePmt(e))
                }
            }, {
                key: "findTrack",
                value: function(e) {
                    for (var t = null, n = this.pes_streams, r = 0; r < n.length; r++)
                        if (n[r].id === e) {
                            t = n[r];
                            break
                        }
                    return t
                }
            }, {
                key: "_parsePat",
                value: function(e) {
                    var t;
                    if (e.payload_unit_start_indicator) {
                        var n = e.payload[0];
                        t = e.payload.subarray(n + 1)
                    } else
                        t = e.payload;
                    for (var r = new eg(t), i = 0; i < r.pmtTable.length; i++)
                        this._add_pid_to_pmt(r.pmtTable[i].programNum, r.pmtTable[i].program_map_PID);
                    return r
                }
            }, {
                key: "_add_pid_to_pmt",
                value: function(e, t) {
                    var n = this.pat_table;
                    (function(e) {
                        for (var t, r = 0; r < n.length; r++)
                            if ((t = n[r]).id === e)
                                return {
                                    idx: r,
                                    item: t
                                };
                        return null
                    }
                    )(e) || n.push({
                        id: e,
                        pid: t
                    })
                }
            }, {
                key: "_parsePmt",
                value: function(e) {
                    var t;
                    if (e.payload_unit_start_indicator) {
                        var n = e.payload[0];
                        t = e.payload.subarray(n + 1)
                    } else
                        t = e.payload;
                    for (var r = new ey(t), i = 0; i < r.pes_table.length; i++)
                        this._add_pes_stream(r.pes_table[i], r);
                    return r
                }
            }, {
                key: "_add_pes_stream",
                value: function(e, t) {
                    var n = this.pes_streams;
                    (function(e) {
                        for (var t, r = 0; r < n.length; r++)
                            if ((t = n[r]).id === e)
                                return {
                                    idx: r,
                                    item: t
                                };
                        return null
                    }
                    )(e.PID) || n.push({
                        id: e.PID,
                        stream_type: e.streamType,
                        pcr_pid: t.PCR_PID,
                        duration: 0,
                        sps: [],
                        pps: [],
                        pixelRatio: [1, 1],
                        timescale: 9e4,
                        width: 0,
                        height: 0
                    })
                }
            }, {
                key: "_parseSdt",
                value: function(e) {
                    if (e.payload_unit_start_indicator) {
                        var t, n = e.payload[0];
                        t = e.payload.subarray(n + 1)
                    } else
                        t = e.payload;
                    var r = new ev(t);
                    return r.service_table.length > 0 && (this.metadata.service_name = r.service_table[0].name,
                    this.metadata.service_provider = r.service_table[0].provider_name),
                    r
                }
            }, {
                key: "currentProgramPID",
                get: function() {
                    for (var e = [], t = 0; t < this.pat_table.length; t++)
                        e.push(this.pat_table[t].pid);
                    return e.length > 0 ? e[0] : -1
                }
            }]),
            e
        }()
          , e_ = function(e) {
            function t(e, n) {
                var r;
                return I(this, t),
                (r = k(this, T(t).call(this))).context = e,
                r.PSI = n,
                r.videoTrack = null,
                r.audioTrack = null,
                r.captionTrack = null,
                r
            }
            return C(t, e),
            D(t, [{
                key: "push",
                value: function(e) {
                    for (var t, n = e, r = 0; r < n.length; r++)
                        switch ((t = n[r]).type) {
                        case "video":
                            this._complexVideo(t);
                            break;
                        case "audio":
                            this._complexAudio(t);
                            break;
                        case "caption":
                            this._complexCaption(t)
                        }
                }
            }, {
                key: "flush",
                value: function() {
                    this.emit("done"),
                    this._clearStream()
                }
            }, {
                key: "reset",
                value: function() {
                    this._clearStream()
                }
            }, {
                key: "_clearStream",
                value: function() {
                    this.videoTrack = null,
                    this.audioTrack = null,
                    this.captionTrack = null
                }
            }, {
                key: "_complexVideo",
                value: function(e) {
                    var t = this.PSI.findTrack(e.trackId);
                    t && (t.type = "video",
                    t.gops = e,
                    t.firstDTS = e[0][0].dts,
                    t.firstPTS = e[0][0].pts,
                    t.duration = 1 / 0,
                    this.videoTrack = t,
                    this.emit("data", {
                        videoTrack: this.videoTrack
                    }))
                }
            }, {
                key: "_complexAudio",
                value: function(e) {
                    var t = this.PSI.findTrack(e.trackId);
                    t && (t.type = "audio",
                    t.frames = e,
                    t.firstPTS = t.firstDTS = e[0].dts,
                    t.duration = 1 / 0,
                    this.audioTrack = t,
                    this.emit("data", {
                        audioTrack: this.audioTrack
                    }))
                }
            }, {
                key: "_complexCaption",
                value: function() {}
            }]),
            t
        }(ed)
          , ex = {
            mac: !1,
            iphone: !1,
            android: !1
        }
          , ek = {
            version: !1,
            CHROME: !1,
            SAFARI: !1,
            FIREFOX: !1,
            IE11: !1,
            IE: !1,
            EDGE: !1,
            WECHAT: !1
        }
          , eS = navigator.userAgent.toLowerCase()
          , eC = /(edge)\/([\w.]+)/.exec(eS) || /(opr)[/]([\w.]+)/.exec(eS) || /(chrome)[ /]([\w.]+)/.exec(eS) || /(firefox)[ /]([\w.]+)/.exec(eS) || /(iemobile)[/]([\w.]+)/.exec(eS) || /(version)(applewebkit)[ /]([\w.]+).*(safari)[ /]([\w.]+)/.exec(eS) || /(webkit)[ /]([\w.]+).*(version)[ /]([\w.]+).*(safari)[ /]([\w.]+)/.exec(eS) || /(webkit)[ /]([\w.]+)/.exec(eS) || /(opera)(?:.*version|)[ /]([\w.]+)/.exec(eS) || /(msie) ([\w.]+)/.exec(eS) || eS.indexOf("trident") >= 0 && /(rv)(?::| )([\w.]+)/.exec(eS) || 0 > eS.indexOf("compatible") && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(eS) || []
          , eM = /(ipad)/.exec(eS) || /(ipod)/.exec(eS) || /(windows phone)/.exec(eS) || /(iphone)/.exec(eS) || /(kindle)/.exec(eS) || /(silk)/.exec(eS) || /(android)/.exec(eS) || /(win)/.exec(eS) || /(mac)/.exec(eS) || /(linux)/.exec(eS) || /(cros)/.exec(eS) || /(playbook)/.exec(eS) || /(bb)/.exec(eS) || /(blackberry)/.exec(eS) || []
          , eA = {
            version: void 0
        }
          , eE = {
            browser: eC[5] || eC[3] || eC[1] || "",
            version: eC[2] || eC[4] || "0",
            versionNumber: eC[4] || eC[2] || "0",
            platform: eM[0] || ""
        };
        if (eE.browser) {
            eA[eE.browser] = !0;
            var eP = eE.versionNumber.split(".");
            eA.version = {
                major: parseInt(eE.versionNumber, 10),
                string: eE.version
            },
            eP.length > 1 && (eA.version.minor = parseInt(eP[1], 10)),
            eP.length > 2 && (eA.version.build = parseInt(eP[2], 10))
        }
        ek.version = eA.version,
        ek.CHROME = !!eA.chrome,
        ek.SAFARI = !!eA.safari && !ek.CHROME,
        ek.FIREFOX = !!eA.firefox,
        ek.IE11 = /rv:11/.test(eS),
        ek.IE = !!eA.msie || ek.IE11,
        ek.EDGE = !!eA.edge,
        ek.WECHAT = /(wechat)|(micromessenger)/.test(eS),
        ex.mac = !!eE.platform.mac,
        ex.iphone = !!eE.platform.iphone,
        ex.android = !!eE.platform.android;
        var eT = ek
          , eI = ex
          , eO = [96e3, 88200, 64e3, 48e3, 44100, 32e3, 24e3, 22050, 16e3, 12e3, 11025, 8e3, 7350]
          , eD = [96e3, 88200, 64e3, 48e3, 44100, 32e3, 24e3, 22050, 16e3, 12e3, 11025, 8e3, 7350]
          , ej = function(e) {
            function t() {
                return I(this, t),
                k(this, T(t).call(this))
            }
            return C(t, e),
            D(t, [{
                key: "push",
                value: function(e) {
                    for (var t, n, r, i, o, a = e.pts, s = e.dts, l = e.payload, u = 0, c = 0; u + 5 < l.length; )
                        if (255 === l[u] && 240 == (246 & l[u + 1])) {
                            if (n = 2 * (1 & ~l[u + 1]),
                            t = (3 & l[u + 3]) << 11 | l[u + 4] << 3 | (224 & l[u + 5]) >> 5,
                            o = 9e4 * (i = 1024 * (1 + (3 & l[u + 6]))) / eD[(60 & l[u + 2]) >>> 2],
                            r = u + t,
                            l.byteLength < r)
                                return;
                            var d = {
                                pts: a + c * o,
                                dts: s + c * o,
                                sampleCount: i,
                                audioObjectType: 1 + (l[u + 2] >>> 6 & 3),
                                channelCount: (1 & l[u + 2]) << 2 | (192 & l[u + 3]) >>> 6,
                                sampleRate: eD[(60 & l[u + 2]) >>> 2],
                                samplingFrequencyIndex: (60 & l[u + 2]) >>> 2,
                                sampleSize: 16,
                                data: l.subarray(u + 7 + n, r)
                            };
                            if (this.emit("frame", d),
                            l.byteLength === r)
                                return l = void 0,
                                void this.emit("done");
                            c++,
                            l = l.subarray(r)
                        } else
                            u++
                }
            }]),
            t
        }(z)
          , eN = function(e) {
            function t(e) {
                var n;
                return I(this, t),
                (n = k(this, T(t).call(this))).PSI = e,
                n.trackId = null,
                n.codec = new ej,
                n.codec.on("frame", function(e) {
                    n.frames.push(e),
                    n.frames.byteLength += e.data.byteLength,
                    n.frames.trackId = n.trackId
                }),
                n._newFrames(),
                n
            }
            return C(t, e),
            D(t, [{
                key: "push",
                value: function(e) {
                    15 === e.stream_type && (this.trackId = e.pid,
                    this.codec.push({
                        dts: e.pes.DTS,
                        pts: e.pes.PTS,
                        payload: e.pes.data_byte
                    }))
                }
            }, {
                key: "flush",
                value: function() {
                    if (this.frames.length > 0) {
                        var e = this.frames.length
                          , t = this.frames[0]
                          , n = this.frames[e - 1]
                          , r = n.sampleRate * n.sampleCount / 9e4;
                        this.frames.firstDTS = t.dts,
                        this.frames.firstPTS = t.pts,
                        this.frames.duration = 1 === e ? r : r + (n.pts - t.pts),
                        this._updateTrackMeta(t),
                        this.emit("data", this.frames),
                        this.reset(),
                        this.emit("done")
                    }
                }
            }, {
                key: "reset",
                value: function() {
                    this.trackId = null,
                    this._newFrames()
                }
            }, {
                key: "_newFrames",
                value: function() {
                    this.frames = [],
                    this.frames.type = "audio",
                    this.frames.byteLength = 0,
                    this.frames.duration = 0,
                    this.frames.firstDTS = 0,
                    this.frames.firstPTS = 0
                }
            }, {
                key: "_updateTrackMeta",
                value: function(e) {
                    var t = this.PSI.findTrack(this.trackId)
                      , n = function(e, t, n) {
                        var r, i, o = e;
                        if (!(t > eO.length - 1))
                            return eT.FIREFOX ? t >= 6 ? (e = 5,
                            i = [, , , , ],
                            r = t - 3) : (e = 2,
                            i = [, , ],
                            r = t) : eI.android ? (e = 2,
                            i = [, , ],
                            r = t) : (e = 5,
                            i = [, , , , ],
                            t >= 6 ? r = t - 3 : (1 === n && (e = 2,
                            i = [, , ]),
                            r = t)),
                            i[0] = e << 3,
                            i[0] |= (14 & t) >> 1,
                            i[1] |= (1 & t) << 7,
                            i[1] |= n << 3,
                            5 === e && (i[1] |= (14 & r) >> 1,
                            i[2] = (1 & r) << 7,
                            i[2] |= 8,
                            i[3] = 0),
                            {
                                config: i,
                                sampleRate: eO[t],
                                channelCount: n,
                                codec: "mp4a.40." + e,
                                realCodec: "mp4a.40." + o
                            };
                        ec.error("invalid sampling index:".concat(t))
                    }(e.audioObjectType, e.samplingFrequencyIndex, e.channelCount);
                    t.config = n.config,
                    t.sampleRate = n.sampleRate,
                    t.inputTimeScale = t.inputTimeScale || t.timescale,
                    t.timescale = n.sampleRate,
                    t.channelCount = n.channelCount,
                    t.codec = n.codec,
                    t.realCodec = n.realCodec,
                    t.isAAC = !0
                }
            }]),
            t
        }(ed);
        function eL(e) {
            for (var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0, n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 1, r = 0, i = "", o = t; o < t + n; o++)
                r = 7 - o % 8,
                i += e[Math.floor(o / 8)] >> r & 1;
            return parseInt(i, 2)
        }
        function eR(e) {
            for (var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0, n = [], r = 8 * e.byteLength, i = !1, o = 0, a = 0, s = "", l = t; l < r; l++)
                if (o = 7 - l % 8,
                a = e[Math.floor(l / 8)] >> o & 1,
                !i) {
                    if (0 !== a) {
                        i = !0,
                        t = l;
                        break
                    }
                    n.push(0)
                }
            for (var u = n.length + 1, c = t; c < t + u; c++)
                o = 7 - c % 8,
                s += a = e[Math.floor(c / 8)] >> o & 1;
            return {
                bitLength: n.length + u,
                value: parseInt(s, 2) - 1
            }
        }
        var eB = eR
          , ez = function(e) {
            var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0
              , n = eR(e, t)
              , r = n.value
              , i = Math.pow(-1, r + 1) * Math.ceil(r / 2);
            return {
                bitLength: n.bitLength,
                value: i
            }
        }
          , eW = eL
          , eF = function(e) {
            var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : 0;
            return eL(e, t, 8)
        }
          , eH = 0;
        function eV(e, t) {
            for (var n, r = 8, i = 8, o = 0; o < t; o++)
                0 != i && (n = eB(e, eH),
                eH += n.bitLength,
                i = (r + n.value + 256) % 256),
                r = e[o]
        }
        var eU, eq, eG = function(e) {
            function t(e) {
                var n;
                switch (I(this, t),
                (n = k(this, T(t).call(this))).forbidden_zero_bit = e[0] >> 7,
                n.ref_idc = e[0] >> 5 & 3,
                n.unit_type = 31 & e[0],
                n.data = function(e) {
                    for (var t, n = e.byteLength, r = [], i = 1, o = new Uint8Array(0); i < n - 2; )
                        0 === e[i] && 0 === e[i + 1] && 3 === e[i + 2] ? (r.push(i + 2),
                        i += 2) : i++;
                    if (0 === r.length)
                        return e;
                    t = n - r.length;
                    try {
                        o = new Uint8Array(t)
                    } catch (e) {
                        throw "epsb alloc mem error ".concat(t)
                    }
                    var a = 0;
                    for (i = 0; i < t; a++,
                    i++)
                        a === r[0] && (a++,
                        r.shift()),
                        o[i] = e[a];
                    return o
                }(e.subarray(1)),
                n.rawData = e,
                n.unit_type) {
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                    break;
                case 7:
                    n.sps = function(e) {
                        eH = 0;
                        var t, n, r, i, o, a, s, l = e[0], u = e[1], c = e[2], d = e.subarray(3), h = 0, f = [1, 1], p = 1, m = 0, g = !0, y = eB(d, eH);
                        if (eH += y.bitLength,
                        100 == l || 110 == l || 122 == l || 244 == l || 44 == l || 83 == l || 86 == l || 118 == l || 128 == l) {
                            var b = eB(d, eH);
                            eH += b.bitLength,
                            3 == b.value && (eH += 1);
                            var w = eB(d, eH)
                              , _ = eB(d, eH += w.bitLength);
                            if (eH += _.bitLength,
                            eH += 1,
                            h = eW(d, eH),
                            eH += 1,
                            h)
                                for (var x = 0; x < (3 != b.value ? 8 : 12); x++) {
                                    var k = eW(d, eH);
                                    eH += 1,
                                    k && eV(d, x < 6 ? 16 : 64)
                                }
                        }
                        var S = eB(d, eH)
                          , C = eB(d, eH += S.bitLength)
                          , M = C.value;
                        if (eH += C.bitLength,
                        0 === M)
                            t = eB(d, eH),
                            eH += t.bitLength;
                        else if (1 === M) {
                            eH += 1,
                            n = ez(d, eH),
                            eH += n.bitLength,
                            r = ez(d, eH),
                            eH += r.bitLength,
                            i = eB(d, eH),
                            eH += i.bitLength;
                            for (var A, E = 0; E < i.value; E++)
                                A = ez(d, eH),
                                eH += A.bitLength
                        }
                        var P = eB(d, eH);
                        eH += P.bitLength;
                        var T = eB(d, eH += 1)
                          , I = eB(d, eH += T.bitLength)
                          , O = eW(d, eH += I.bitLength);
                        eH += 1,
                        O || (eH += 1);
                        var D = eW(d, eH += 1);
                        eH += 1;
                        var j = 0
                          , N = 0
                          , L = 0
                          , R = 0;
                        if (D) {
                            var B = eB(d, eH);
                            eH += B.bitLength,
                            j = B.value;
                            var z = eB(d, eH);
                            eH += z.bitLength,
                            N = z.value;
                            var W = eB(d, eH);
                            eH += W.bitLength,
                            L = W.value;
                            var F = eB(d, eH);
                            eH += F.bitLength,
                            R = F.value
                        }
                        var H = eW(d, eH);
                        if (eH += 1,
                        H) {
                            var V = eW(d, eH);
                            if (eH += 1,
                            V) {
                                var U = eF(d, eH);
                                switch (eH += 8,
                                U) {
                                case 1:
                                    f = [1, 1];
                                    break;
                                case 2:
                                    f = [12, 11];
                                    break;
                                case 3:
                                    f = [10, 11];
                                    break;
                                case 4:
                                    f = [16, 11];
                                    break;
                                case 5:
                                    f = [40, 33];
                                    break;
                                case 6:
                                    f = [24, 11];
                                    break;
                                case 7:
                                    f = [20, 11];
                                    break;
                                case 8:
                                    f = [32, 11];
                                    break;
                                case 9:
                                    f = [80, 33];
                                    break;
                                case 10:
                                    f = [18, 11];
                                    break;
                                case 11:
                                    f = [15, 11];
                                    break;
                                case 12:
                                    f = [64, 33];
                                    break;
                                case 13:
                                    f = [160, 99];
                                    break;
                                case 14:
                                    f = [4, 3];
                                    break;
                                case 15:
                                    f = [3, 2];
                                    break;
                                case 16:
                                    f = [2, 1];
                                    break;
                                case 255:
                                    var q = eF(d, eH)
                                      , G = eF(d, eH += 8)
                                      , X = eF(d, eH += 8)
                                      , $ = eF(d, eH += 8);
                                    eH += 8,
                                    f = [q << 8 | G, X << 8 | $]
                                }
                                f && (p = f[0] / f[1]),
                                255 === U && (eH += 16,
                                eH += 16)
                            }
                            var Y = eW(d, eH);
                            eH += 1,
                            Y && (eH += 1);
                            var K = eW(d, eH);
                            if (eH += 1,
                            K) {
                                o = eW(d, eH, 3),
                                eH += 3;
                                var Z = eW(d, eH += 1);
                                eH += 1,
                                Z && (eH += 24)
                            }
                            var J = eW(d, eH);
                            if (eH += 1,
                            J) {
                                var Q = eB(d, eH)
                                  , ee = eB(d, eH += Q.bitLength);
                                eH += ee.bitLength
                            }
                            var et = eW(d, eH);
                            eH += 1,
                            et && (a = eW(d, eH, 32),
                            eH += 32,
                            s = eW(d, eH, 32),
                            eH += 32,
                            g = !!eW(d, eH),
                            eH += 1,
                            m = s / (2 * a))
                        }
                        return {
                            payload: d,
                            profile_idc: l,
                            profile_compatibility: u,
                            level_idc: c,
                            sps_id: y.value,
                            log2_max_frame_num_minus4: C.value,
                            pic_order_cnt_type: M,
                            log2_max_pic_order_cnt_lsb_minus4: t ? t.value : 0,
                            width: Math.ceil((16 * (T.value + 1) - 2 * j - 2 * N) * p),
                            height: (2 - O) * (I.value + 1) * 16 - 2 * L - 2 * R,
                            pixelRatio: f,
                            video_format: o,
                            fps: m,
                            fixedFPS: g
                        }
                    }(n.data);
                    break;
                case 8:
                    n.pps = function(e) {
                        var t, n = 0, r = e, i = [], o = 0;
                        n += eB(r, n).bitLength,
                        n += eB(r, n).bitLength,
                        n += 1,
                        n += 1;
                        var a = eB(r, n);
                        if (n += a.bitLength,
                        a.value > 0) {
                            var s = eB(r, n);
                            n += s.bitLength;
                            var l = 0;
                            switch (s.value) {
                            case 0:
                                for (l = 0; l <= s.value; l++)
                                    n += eB(r, n).bitLength;
                                break;
                            case 2:
                                for (l = 0; l <= s.value; l++)
                                    n += eB(r, n).bitLength,
                                    n += eB(r, n).bitLength;
                                break;
                            case 3:
                            case 4:
                            case 5:
                                n += 1,
                                n += eB(r, n).bitLength;
                                break;
                            case 6:
                                n += (t = eB(r, n)).bitLength;
                                var u = Math.ceil(Math.log2(a.value + 1));
                                for (o = 0; o <= t.value; o++)
                                    i.push(eW(r, n, u)),
                                    n += u
                            }
                        }
                        return n += eB(r, n).bitLength,
                        n += eB(r, n).bitLength,
                        n += 1,
                        n += 1,
                        n += ez(r, n).bitLength,
                        n += ez(r, n).bitLength,
                        n += ez(r, n).bitLength,
                        n += 1,
                        n += 1,
                        n += 1,
                        {
                            sliceGroupNum: a.value + 1
                        }
                    }(n.data);
                    break;
                case 6:
                    n.data,
                    n.sei = {};
                    break;
                case 9:
                    n.primary_pic_type = n.data[0] >> 5
                }
                return n
            }
            return C(t, e),
            t
        }(em), eX = function(e) {
            function t() {
                var e;
                return I(this, t),
                (e = k(this, T(t).call(this))).cachedBytes = null,
                e
            }
            return C(t, e),
            D(t, [{
                key: "push",
                value: function(e) {
                    var t, n = 0, r = 0, i = 0, o = e.pts, a = e.dts, s = e.payload, l = e.naluSizeLength;
                    if (this.cachedBytes) {
                        try {
                            t = new Uint8Array(this.cachedBytes.byteLength + s.byteLength)
                        } catch (e) {
                            throw "h264 alloc mem error ".concat(this.cachedBytes.byteLength, "/").concat(s.byteLength)
                        }
                        t.set(this.cachedBytes),
                        t.set(s, this.cachedBytes.byteLength)
                    } else
                        t = s;
                    if (l) {
                        var u = 0
                          , c = 0
                          , d = 0;
                        do {
                            c = 0;
                            for (var h = 0; h < l; h++)
                                c |= t[u + h] << 8 * (l - h - 1);
                            (d = (u += l) + c) > t.length && (d = t.length);
                            var f = new eG(t.subarray(u, d));
                            f.pts = o,
                            f.dts = a,
                            this.emit("nalu", f),
                            u = d
                        } while (u < t.length)
                    } else {
                        var p = t.byteLength - 1
                          , m = 0;
                        do {
                            if (0 !== t[p])
                                break;
                            m++,
                            p--
                        } while (p > 0);
                        m >= 3 && (t = t.subarray(0, p + 1));
                        do {
                            var g = t[n] << 24 | t[n + 1] << 16 | t[n + 2] << 8 | t[n + 3]
                              , y = t.length - n >= 4 ? g : -1
                              , b = 0
                              , w = n === t.length - 1;
                            if (y >> 8 == 1 ? b = 3 : 1 === y && (b = 4),
                            3 === b || 4 === b || w) {
                                var _ = r + i
                                  , x = w && m >= 3;
                                if (n > r && (!w || x)) {
                                    var k = new eG(t.subarray(_, x ? n + 1 : n));
                                    k.pts = o,
                                    k.dts = a,
                                    this.emit("nalu", k),
                                    r = n
                                }
                                w && (m < 3 ? (this.cachedBytes = t.subarray(r),
                                this.cachedBytes.pts = o,
                                this.cachedBytes.dts = a,
                                this.cachedBytes.startCodeLength = i) : this.cachedBytes = null),
                                n === r && (i = b),
                                n += b || 1
                            } else
                                n++
                        } while (n < t.length)
                    }
                    if (this.cachedBytes) {
                        var S = new eG(this.cachedBytes.subarray(this.cachedBytes.startCodeLength));
                        S.pts = this.cachedBytes.pts,
                        S.dts = this.cachedBytes.dts,
                        this.emit("nalu", S),
                        this.cachedBytes = null
                    }
                    this.emit("done")
                }
            }, {
                key: "reset",
                value: function() {
                    this.cachedBytes = null
                }
            }]),
            t
        }(z), e$ = function(e) {
            function t(e) {
                var n;
                return I(this, t),
                (n = k(this, T(t).call(this))).PSI = e,
                n.trackId = null,
                n.currentFrame = [],
                n.codec = new eX,
                n._newGop(),
                n._newGops(),
                n.codec.on("nalu", function(e) {
                    if (7 === e.unit_type) {
                        var t = n.PSI.findTrack(n.trackId);
                        t.codec = function(e) {
                            for (var t = "avc1.", n = [e.profile_idc, e.profile_compatibility, e.level_idc], r = 0; r < n.length; r++) {
                                var i = n[r].toString(16);
                                i.length < 2 && (i = "0" + i),
                                t += i
                            }
                            return {
                                codec: t
                            }
                        }(e.sps).codec,
                        t.width = e.sps.width,
                        t.height = e.sps.height,
                        t.profileIdc = e.sps.profile_idc,
                        t.profileCompatibility = e.sps.profile_compatibility,
                        t.levelIdc = e.sps.level_idc,
                        t.pixelRatio = e.sps.pixelRatio,
                        t.sps = [e.rawData]
                    } else
                        8 === e.unit_type && (n.PSI.findTrack(n.trackId).pps = [e.rawData]);
                    n._grouping(e)
                }),
                n
            }
            return C(t, e),
            D(t, [{
                key: "push",
                value: function(e) {
                    var t = e.stream_type
                      , n = e.pes
                      , r = e.pid;
                    if (27 === t || 36 === t) {
                        this.trackId = r;
                        var i = {
                            pts: n.PTS,
                            dts: n.DTS,
                            payload: n.data_byte
                        };
                        this.codec.push(i)
                    }
                }
            }, {
                key: "flush",
                value: function() {
                    this.currentFrame.length > 0 && ((!this.currentFrame.duration || this.currentFrame.duration <= 0) && (this.currentFrame.duration = this.prevFrame.duration || 0),
                    this._pushFrameIntoGop(),
                    this.currentFrame = []),
                    this.gop.length > 0 && this._pushGopIntoGroup()
                }
            }, {
                key: "reset",
                value: function() {
                    this.codec.reset(),
                    this.currentFrame = [],
                    this._newGop(),
                    this._newGops()
                }
            }, {
                key: "_grouping",
                value: function(e) {
                    9 === e.unit_type ? (this.currentFrame.length > 0 && (this.currentFrame.duration = e.dts - this.currentFrame.dts,
                    this.gop.length > 0 && this.currentFrame.keyframe && (this.gop.trackId = this.trackId,
                    this._pushGopIntoGroup()),
                    this.currentFrame.keyframe || this.gop.length > 0 ? this._pushFrameIntoGop() : ec.warn("h264 codec drop frame")),
                    this.prevFrame = this.currentFrame,
                    this.currentFrame = [],
                    this.currentFrame.keyframe = !1,
                    this.currentFrame.byteLength = 0,
                    this.currentFrame.naluCount = 0,
                    this.currentFrame.pts = e.pts,
                    this.currentFrame.dts = e.dts) : (5 === e.unit_type && (this.currentFrame.keyframe = !0),
                    this.currentFrame.byteLength += e.rawData.byteLength,
                    this.currentFrame.naluCount++,
                    this.currentFrame.push(e)),
                    this.currentFrame.duration = e.dts - this.currentFrame.dts
                }
            }, {
                key: "_newGop",
                value: function() {
                    this.gop = [],
                    this.gop.duration = 0,
                    this.gop.naluCount = 0,
                    this.gop.byteLength = 0
                }
            }, {
                key: "_pushFrameIntoGop",
                value: function() {
                    this.gop.push(this.currentFrame),
                    this.gop.duration += this.currentFrame.duration,
                    this.gop.byteLength += this.currentFrame.byteLength,
                    this.gop.naluCount += this.currentFrame.naluCount
                }
            }, {
                key: "_newGops",
                value: function() {
                    this.gops = [],
                    this.gops.type = "video",
                    this.gops.duration = 0,
                    this.gops.naluCount = 0,
                    this.gops.byteLength = 0,
                    this.gops.frameLength = 0,
                    this.gops.firstDTS = 0
                }
            }, {
                key: "_pushGopIntoGroup",
                value: function() {
                    var e = this.gop[0];
                    this.gops.trackId = this.trackId,
                    this.gops.duration += this.gop.duration,
                    this.gops.byteLength += this.gop.byteLength,
                    this.gops.naluCount += this.gop.naluCount,
                    this.gops.frameLength += this.gop.length,
                    this.gops.firstDTS = e.dts,
                    this.gops.firstPTS = e.pts,
                    this.gops.push(this.gop),
                    this.emit("data", this.gops),
                    this._newGop(),
                    this._newGops(),
                    this.emit("done")
                }
            }]),
            t
        }(ed), eY = function(e) {
            function t(e, n) {
                var r, i = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
                return I(this, t),
                (r = k(this, T(t).call(this))).context = e,
                r.PSI = n,
                r.options = i,
                r.tracks = [],
                r.adtsStream = new eN(n),
                r.avcStream = new e$(n),
                r.streams = [r.adtsStream, r.avcStream],
                i.decodeCodec && (r.avcStream.on("data", function(e) {
                    var t = i.config.stubTime;
                    if (ee(t)) {
                        var n = (e.firstPTS + e.duration) / 9e4;
                        if (n < t)
                            return void ec.warn("drop avc gop, start/end/stubTime(".concat(e.firstPTS, "/").concat(n, "/").concat(t, ")"))
                    }
                    r.tracks.push(e),
                    r.emit("data", r.tracks),
                    r.tracks = [],
                    r.adtsStream.flush()
                }),
                r.adtsStream.on("data", function(e) {
                    var t = i.config.stubTime;
                    if (ee(t)) {
                        var n = (e.firstPTS + e.duration) / 9e4;
                        if (n < t)
                            return void ec.warn("drop adts, start/end/stubTime(".concat(e.firstPTS, "/").concat(n, "/").concat(t, ")"))
                    }
                    r.tracks.push(e),
                    r.emit("data", r.tracks),
                    r.tracks = []
                })),
                r
            }
            return C(t, e),
            D(t, [{
                key: "push",
                value: function(e) {
                    var t = this.options
                      , n = this.adtsStream
                      , r = this.avcStream
                      , i = e.stream_type;
                    if (t.decodeCodec)
                        switch (i) {
                        case 27:
                        case 36:
                            r.push(e);
                            break;
                        case 15:
                            n.push(e);
                            break;
                        default:
                            ec.warn("ts elementary encounter unknown stream type ".concat(i))
                        }
                    else
                        this.emit("data", e)
                }
            }, {
                key: "flush",
                value: function() {
                    for (var e = this.streams, t = this.tracks, n = 0; n < this.streams.length; n++)
                        e[n].flush();
                    t.length > 0 && this.emit("data", t),
                    this.emit("done"),
                    t.splice(0, t.length)
                }
            }, {
                key: "reset",
                value: function() {
                    this.tracks = [];
                    for (var e = 0; e < this.streams.length; e++)
                        this.streams[e].reset();
                    this.emit("reset")
                }
            }]),
            t
        }(ed), eK = function(e) {
            function t(e) {
                var n;
                return I(this, t),
                (n = k(this, T(t).call(this))).start_code_prefix = n.readUint16(e, 0) << 8 | e[2],
                n.stream_id = e[3],
                n.packet_length = n.readUint16(e, 4),
                n.data_alignment_indicator = 4 & e[6],
                n.copyright = 2 & e[6],
                n.PTS_DTS_flags = e[7] >> 6,
                n.ESCR_flag = 32 & e[7],
                n.ES_rate_flag = 16 & e[7],
                n.trick_mode_flag = 8 & e[7],
                n.additional_copy_info_flag = 4 & e[7],
                n.CRC_flag = 2 & e[7],
                n.extension_flag = 1 & e[7],
                n.header_data_length = e[8],
                n.PTS = 0,
                2 == (2 & n.PTS_DTS_flags) && (n.PTS = n.calcTimestamp_(e, 9)),
                n.DTS = n.PTS,
                1 == (1 & n.PTS_DTS_flags) && (n.DTS = n.calcTimestamp_(e, 14)),
                n.data_byte = e.subarray(9 + n.header_data_length),
                n
            }
            return C(t, e),
            D(t, [{
                key: "calcTimestamp_",
                value: function(e, t) {
                    return 0x20000000 * (14 & e[t]) + (e[t + 1] << 22) + (e[t + 2] >> 1 << 15) + (e[t + 3] << 7) + (e[t + 4] >> 1)
                }
            }, {
                key: "valid",
                value: function() {
                    var e = this.start_code_prefix;
                    return 0 === e[0] && 0 === e[1] && 1 === e[2]
                }
            }]),
            t
        }(em), eZ = function(e) {
            function t(e, n) {
                var r;
                return I(this, t),
                (r = k(this, T(t).call(this))).context = e,
                r.PSI = n,
                r.PID = null,
                r.cache_buffer = new er,
                r
            }
            return C(t, e),
            D(t, [{
                key: "push",
                value: function(e) {
                    e.PID > 255 && e.PID < 8191 && (-1 == this.PSI.currentProgramPID ? this._pushPacket(e) : this.PSI.currentProgramPID !== e.PID && (1 === e.payload_unit_start_indicator && this._assembleOnePES(),
                    this._pushPacket(e)))
                }
            }, {
                key: "flush",
                value: function() {
                    this._assembleOnePES(),
                    this.emit("done")
                }
            }, {
                key: "reset",
                value: function() {
                    this._clearCached(),
                    this.emit("reset")
                }
            }, {
                key: "_clearCached",
                value: function() {
                    this.PID = null,
                    this.cache_buffer.clear()
                }
            }, {
                key: "_pushPacket",
                value: function(e) {
                    var t = this.cache_buffer.empty;
                    t && 0 === e.payload_unit_start_indicator || (t && (this.PID = e.PID),
                    this.cache_buffer.append(e.payload))
                }
            }, {
                key: "_assembleOnePES",
                value: function() {
                    if (!this.cache_buffer.empty) {
                        try {
                            e = this.cache_buffer.toNewBytes()
                        } catch (e) {
                            throw "pes alloc mem err ".concat(this.cache_buffer.byteLength)
                        }
                        var e, t = new eK(e), n = this.PSI.findTrack(this.PID);
                        if (n) {
                            var r = {
                                pid: n.id,
                                stream_type: n.stream_type,
                                pcr_pid: n.pcr_pid,
                                pes: t
                            };
                            this.emit("data", r)
                        }
                        this._clearCached()
                    }
                }
            }]),
            t
        }(ed), eJ = function(e) {
            function t(e) {
                var n;
                if (I(this, t),
                (n = k(this, T(t).call(this))).sync_byte = e[0],
                n.transport_error_indicator = e[1] >> 7,
                n.payload_unit_start_indicator = e[1] >> 6 & 1,
                n.transport_priority = e[1] >>> 5 & 1,
                n.PID = 8191 & n.readUint16(e, 1),
                n.tsc = e[3] >> 6,
                n.afc = e[3] >> 4 & 3,
                n.continuity_counter = 15 & e[3],
                n.has_payload = 1 & n.afc,
                n.has_adaptation = 2 & n.afc,
                n.has_payload)
                    if (n.has_adaptation) {
                        var r = e[4];
                        n.payload = e.subarray(5 + r)
                    } else
                        n.payload = e.subarray(4);
                return n
            }
            return C(t, e),
            D(t, [{
                key: "valid",
                value: function() {
                    return 71 === this.sync_byte && 1 === this.has_payload
                }
            }]),
            t
        }(em), eQ = function(e) {
            function t() {
                var e, n = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
                return I(this, t),
                (e = k(this, T(t).call(this, n))).psi_ = new ew(e.ctx_),
                e.pesStream_ = new eZ(e.ctx_,e.psi_),
                e.elementaryStream_ = new eY(e.ctx_,e.psi_,n),
                e.complexStream_ = new e_(e.ctx_,e.psi_),
                e.pipe(e.pesStream_),
                e.pesStream_.pipe(e.elementaryStream_),
                e.elementaryStream_.pipe(e.complexStream_),
                w(T(t.prototype), "listenEndStream_", S(e)).call(S(e)),
                e
            }
            return C(t, e),
            D(t, [{
                key: "push",
                value: function(e, n) {
                    var r = n.done
                      , i = this.options_
                      , o = this.ctx_
                      , a = this.cache_buffer_
                      , s = this.psi_
                      , l = w(T(t.prototype), "constraintPushData_", this).call(this, e)
                      , u = a.byteLength
                      , c = null;
                    for (i.config = n,
                    ec.log("hls demux received ".concat(l.byteLength, " bytes, cache ").concat(u, " bytes. ").concat(r ? "chunk done" : "")),
                    a.append(l); a.byteLength >= 188; ) {
                        var d = a.cut(188);
                        if (d) {
                            var h = new eJ(d);
                            if (!h.valid()) {
                                var f = "Encounter invalid ts packet, packet_length(".concat(d.length, "), cache_length(").concat(this.cache_buffer_.byteLength, "), has_payload(").concat(h.has_payload, "), data(").concat(d, ")");
                                ec.error(f),
                                this.reset(),
                                o.emit("error", ef.TS_SYNC_BYTE, f, {
                                    startByte: c,
                                    endByte: c + d.byteLength
                                });
                                break
                            }
                            s.parse(h),
                            this.emit("data", h),
                            c += d.byteLength
                        }
                    }
                    a.empty && r && this.emit("done")
                }
            }, {
                key: "reset",
                value: function() {
                    this.cache_buffer_.clear(),
                    this.emit("reset")
                }
            }, {
                key: "endStream",
                get: function() {
                    var e = this.elementaryStream_;
                    return this.options_.decodeCodec && (e = this.complexStream_),
                    e
                }
            }]),
            t
        }(eh);
        !function(e) {
            e[e.HEAD = 0] = "HEAD",
            e[e.BODY = 1] = "BODY"
        }(eU || (eU = {})),
        function(e) {
            e[e.SCRIPT_DATA = 18] = "SCRIPT_DATA",
            e[e.VIDEO = 9] = "VIDEO",
            e[e.AUDIO = 8] = "AUDIO"
        }(eq || (eq = {})),
        function(e) {
            e[e.AAC = 10] = "AAC"
        }(r || (r = {})),
        function(e) {
            e[e.MONO = 0] = "MONO",
            e[e.STEREO = 1] = "STEREO"
        }(i || (i = {})),
        function(e) {
            e[e.SEQUENCE_HEAD = 0] = "SEQUENCE_HEAD",
            e[e.AAC_RAW = 1] = "AAC_RAW"
        }(o || (o = {})),
        function(e) {
            e[e.SEQUENCE_HEAD = 0] = "SEQUENCE_HEAD",
            e[e.NALU = 1] = "NALU",
            e[e.SEQUENCE_END = 2] = "SEQUENCE_END"
        }(a || (a = {}));
        var e0 = new eX
          , e1 = [];
        e0.on("nalu", function(e) {
            e1.push(e)
        }),
        function(e) {
            e[e.AVC = 7] = "AVC"
        }(s || (s = {}));
        var e2 = function() {
            function e(t) {
                c()(this, e),
                b()(this, "previousPes", null),
                b()(this, "maxAudioPTS", 0),
                b()(this, "maxVideoPTS", 0),
                t ? (this.init(),
                this.dataArray = [],
                this.videoArray = [],
                this.audioArray = [],
                this.decode = t) : console.error("class TsDemux need pass decode parmas")
            }
            return h()(e, [{
                key: "init",
                value: function() {
                    var e = this;
                    try {
                        this.demuxer = new eQ({
                            enableWorker: !1,
                            debug: !1,
                            onlyDemuxElementary: !0
                        }),
                        this.demuxer.on(l.DEMUX_DATA, function(t) {
                            t instanceof Array ? (e.dataArray.push(t),
                            e.demuxed(e.dataArray),
                            e.dataArray = []) : e.dataArray.push(t)
                        }),
                        this.demuxer.on(l.DONE, function(t) {
                            var n = {};
                            e.demuxed(e.dataArray),
                            e.dataArray = [],
                            e.previousPes.partEnd = !0,
                            e.previousPes.lastTS = e.isLast,
                            e.isLast ? (e.maxPTS = Math.min(e.maxAudioPTS, e.maxVideoPTS),
                            n.audioEnd = !0,
                            e.audioQueue(n),
                            self.postMessage({
                                type: "demuxedAAC",
                                data: e.audioArray
                            }),
                            e.audioArray = [],
                            self.postMessage({
                                type: "maxPTS",
                                data: {
                                    maxAudioPTS: e.maxAudioPTS,
                                    maxVideoPTS: e.maxVideoPTS
                                }
                            })) : (self.postMessage({
                                type: "demuxedAAC",
                                data: e.audioArray
                            }),
                            e.audioArray = []),
                            e.decode.push(e.videoArray),
                            e.videoArray = [],
                            e.previousPes = null
                        })
                    } catch (e) {
                        console.error("init demuxer failed.")
                    }
                }
            }, {
                key: "push",
                value: function(e) {
                    this.demuxer.push(e, {
                        done: !0
                    })
                }
            }, {
                key: "demuxed",
                value: function(e) {
                    var t = this;
                    e.forEach(function(e) {
                        t.tsDemuxed(e)
                    })
                }
            }, {
                key: "tsDemuxed",
                value: function(e) {
                    var t = e.stream_type
                      , n = e.pes || {};
                    switch (t) {
                    case 36:
                        this.videoQueue(n);
                        break;
                    case 3:
                    case 15:
                    case 17:
                        n.PTS = Math.round(n.PTS * f.a * 1e3),
                        this.maxAudioPTS = Math.max(n.PTS, this.maxAudioPTS),
                        this.audioQueue(n)
                    }
                }
            }, {
                key: "audioQueue",
                value: function(e) {
                    this.audioArray.push(e)
                }
            }, {
                key: "videoQueue",
                value: function(e) {
                    this.previousPes = e,
                    this.maxVideoPTS = Math.max(this.maxVideoPTS, e.PTS),
                    this.videoArray.push(e)
                }
            }, {
                key: "destroy",
                value: function() {
                    this.demuxer.destroy()
                }
            }]),
            e
        }();
        self.decode = new g,
        self.demuxer = new e2(self.decode),
        t.default = function(e) {
            e.onmessage = function(t) {
                var n = t.data
                  , r = n.type
                  , i = n.data
                  , o = n.isLast;
                switch (r) {
                case "startDemux":
                    e.demuxer.isLast = o,
                    e.demuxer.push(i);
                    break;
                case "loadwasm":
                    e.decode.loadWASM(t);
                    break;
                case "flush":
                    e.decode.flush()
                }
            }
        }
    },
    0: function(e, t) {
        e.exports = function(e, t, n) {
            return t in e ? Object.defineProperty(e, t, {
                value: n,
                enumerable: !0,
                configurable: !0,
                writable: !0
            }) : e[t] = n,
            e
        }
    },
    9: function(e, t, n) {
        "use strict";
        n.d(t, "c", function() {
            return r
        }),
        n.d(t, "b", function() {
            return o
        }),
        n.d(t, "a", function() {
            return a
        }),
        n.d(t, "d", function() {
            return s
        });
        var r = {
            projectName: "GOLDPLAY",
            projectAbbreviation: "GP",
            mode: "production",
            basePath: "./",
            get distPath() {
                var i = "";
                return "development" == this.mode ? i = "/dist/" : "test" == this.mode && (i = "/dist/"),
                i
            },
            get libPath() {
                return this.distPath + "lib/"
            },
            hideBarBoxTime: 300,
            speedList: [{
                name: "0.5X",
                value: .5
            }, {
                name: "1.0X",
                value: 1
            }, {
                name: "1.5X",
                value: 1.5
            }, {
                name: "2.0X",
                value: 2
            }, {
                name: "3.0X",
                value: 3
            }]
        }
          , o = {
            maxDuration: 30,
            maxSize: 1024e6,
            maxRetryCount: 3
        }
          , a = 1 / 9e4
          , s = {
            READYBUFFERLENGTH: 1e3,
            MAXBUFFERLENGTH: 5e3
        }
    },
    3: function(e, t) {
        function n(e, t) {
            for (var n = 0; n < t.length; n++) {
                var r = t[n];
                r.enumerable = r.enumerable || !1,
                r.configurable = !0,
                "value"in r && (r.writable = !0),
                Object.defineProperty(e, r.key, r)
            }
        }
        e.exports = function(e, t, r) {
            return t && n(e.prototype, t),
            r && n(e, r),
            e
        }
    },
    2: function(e, t) {
        e.exports = function(e, t) {
            if (!(e instanceof t))
                throw TypeError("Cannot call a class as a function")
        }
    }
}))(self);
