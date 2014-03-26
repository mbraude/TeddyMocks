/// <reference path="scripts/typings/qunit/qunit.d.ts" />

module TeddyMocks {

    export class ObjectToStub {

        private barVal: number;

        constructor() {
            this.barVal = -1;
        }

        public foo() {
            throw "Should not be called";
        }
        public bar(arg?: number): number {
            return this.barVal;
        }
        public fooBar(n: number): void {
        }
    }

    export function globalFunction() {
        throw "Should not be called";
    }

    test("Stub only accepts function types", function () {

        var stub = new Stub<ObjectToStub>(ObjectToStub);
        ok(stub !== undefined, "Accepted a function (class)");

        var threw = false;
        try {
            new Stub<any>(<Function>{ });
        } catch (e) {
            threw = true;
        }

        ok(threw, "Threw when not given an object");
    });

    test("Stub copies target's prototype", function () {
        var stub = new Stub<ObjectToStub>(ObjectToStub);
        equal(stub.object.bar(), -1, "Called the base classes bar() implementation");
    });

    test("Stub calls base class by default", function () {

        var stub = new Stub<ObjectToStub>(ObjectToStub);

        // Verify that we don't override this method by accident:
        var threw = false;
        try {
            stub.object.foo();
        } catch (e) {
            threw = true;
        }

        ok(threw, "Mock called baseclass as expected");
    });

    test("stubs() intercepts calls to baseclass", function () {

        var stub = new Stub<ObjectToStub>(ObjectToStub);

        var state1 = stub.stubs(m => m.foo());
        ok(state1, "State2 is defined");

        // Should not throw:
        stub.object.foo();
        ok(true, "Correctly intercepted base class");
    });

    test("andReturns() sets return value", function () {

        var expected = 123;
        var stub = new Stub<ObjectToStub>(ObjectToStub);

        stub.stubs(m => m.bar()).andReturns(expected);

        equal(stub.object.bar(), expected, "Correct value returned");
    });

    test("clearStubbedMethods() resets state of stubbed methods", function () {

        var expected = -1;
        var stub = new Stub<ObjectToStub>(ObjectToStub);

        stub.stubs(m => m.bar()).andReturns(expected);
        stub.clearStubbedMethods();

        equal(stub.object.bar(), expected, "Correct value returned");
    });

    test("Stub uses callback", function () {

        var expected = 123;
        var stub = new Stub<ObjectToStub>(ObjectToStub);

        stub.stubs(m => m.bar()).withCallback(otm => expected);
        equal(stub.object.bar(), expected, "Correct value returned");
    });

    test("Stub correctly asserts with no arguments", function () {

        var expected = 123;
        var stub = new Stub<ObjectToStub>(ObjectToStub);

        stub.stubs(m => m.bar()).andReturns(expected);
        equal(stub.object.bar(), expected, "Correct value returned");

        ok(stub.assertsThat(s => s.bar()).wasCalled(), "bar was called one time");
    });

    test("clearRecordedMethods clears all recorded methods", function () {
        var stub = new Stub<ObjectToStub>(ObjectToStub);
        stub.stubs(s => s.bar()).andReturns(123);
        stub.object.bar();
        ok(stub.assertsThat(s => s.bar()).wasCalled(), "bar was called");
        stub.clearRecordedMethods();
        ok(!stub.assertsThat(s => s.bar()).wasCalled(), "bar was erased from the stub");
    });

    test("Stub correctly asserts with arguments", function () {

        var expected = 123;
        var notExpected = 321;
        var stub = new Stub<ObjectToStub>(ObjectToStub);

        stub.stubs(m => m.fooBar(expected));
        stub.object.fooBar(expected);

        ok(stub.assertsThat(s => s.fooBar(expected)).wasCalled(), "bar was called times with expected arguments");
        ok(!stub.assertsThat(s => s.fooBar(notExpected)).wasCalled(), "did not assert on unexpected parameters");
    });

    test("wasCalled overloads work as expected", function () {

        var expected = 123;
        var stub = new Stub<ObjectToStub>(ObjectToStub);

        stub.stubs(m => m.fooBar(expected));

        stub.object.fooBar(expected);
        ok(stub.assertsThat(s => s.fooBar(expected)).wasCalled(), "wasCalled worked");

        stub.object.fooBar(expected);
        ok(stub.assertsThat(s => s.fooBar(expected)).wasCalledTwoTimes(), "wasCalledTwoTimes worked");

        stub.object.fooBar(expected);
        ok(stub.assertsThat(s => s.fooBar(expected)).wasCalledThreeTimes(), "wasCalledThreeTimes worked");

        stub.object.fooBar(expected);
        ok(stub.assertsThat(s => s.fooBar(expected)).wasCalledFourTimes(), "wasCalledFourTimes worked");

        stub.object.fooBar(expected);
        ok(stub.assertsThat(s => s.fooBar(expected)).wasCalledFiveTimes(), "wasCalledFiveTimes worked");

        stub.object.fooBar(expected);
        ok(stub.assertsThat(s => s.fooBar(expected)).wasCalledXTimes(6), "wasCalledXTimes worked");

        for (var i = 0; i < 20; i++) {
            stub.object.fooBar(expected);
            stub.object.fooBar(expected);
            stub.object.fooBar(expected);
            stub.object.fooBar(expected);
            stub.object.fooBar(expected);
        }

        ok(stub.assertsThat(s => s.fooBar(expected)).wasCalledAnyNumberOfTimes(), "wasCalledAnyNumberOfTimes worked");
    });

    test("stub records even if method was not stub", function () {
        var stub = new Stub<ObjectToStub>(ObjectToStub);
        equal(stub.object.bar(), -1, "bar was called as expected");
        ok(stub.assertsThat(s => s.bar()).wasCalled(), "Was able to assert even without stubbing");
    });

    test("usingCallback invokes callback to verify method calls", function () {
        var stub = new Stub<ObjectToStub>(ObjectToStub);
        stub.object.fooBar(123);
        stub.object.fooBar(123456);
        stub.object.fooBar(123456789);
        ok(stub.assertsThat(s => s.fooBar(0)).usingCallback(args => args[0] === 123), "callback was invoked to verify arguments");
    });

    test("assertsThat matches recorded methods even if arguments do not match", function () {
        var stub = new Stub<ObjectToStub>(ObjectToStub);
        stub.stubs(s => s.fooBar(123));
        stub.object.fooBar(123);
        ok(stub.assertsThat(s => s.fooBar(0), false), "assertsThat successfully ignored arguments");
        ok(stub.assertsThat(s => s.fooBar(123), true), "assertsThat matched arguments");
    });

    test("stubs matches all methods if told to ignore arguments", function () {
        var stub = new Stub<ObjectToStub>(ObjectToStub);
        stub.stubs(s => s.bar(0), false).andReturns(123);

        equal(stub.object.bar(321), 123, "Stubbed even though arguments did not match");
    });

    test("GlobalStubs must be in global scope to work", function () {

        var threw = false;
        try {
            var globalStub = new GlobalStub<XMLHttpRequest>("XMLHttpRequest");
        } catch (e) {
            threw = true;
        }

        ok(threw, "Threw when creating a global stub outside of a global scope");
    });

    test("GlobalStubs can be created in a global scope", function () {
        GlobalOverride.createScope(() => {
            var globalStub = new GlobalStub<XMLHttpRequest>("XMLHttpRequest");
            ok(globalStub.object.send, "Stub was created successfully");
        });
    });

    test("GlobalStub replaces implementation", function () {
        GlobalOverride.createScope(() => {

            var globalStub = new GlobalStub<XMLHttpRequest>("XMLHttpRequest");
            globalStub.stubs(s => s.send(undefined), false);

            var request = new XMLHttpRequest();
            request.send(undefined);

            ok(globalStub.assertsThat(s => s.send(undefined)).wasCalled(), "Globally overriden stub was created successfully");
        });
    });    

    test("GlobalStub cannot replace global functions if not in scope", function () {
        var threw = false;
        try {
            GlobalOverride.replace("globalFunction", TeddyMocks, () => { });
        }
        catch (ex) {
            threw = true;
        }

        ok(threw, "Failed outside of a global scope");
    });

    test("GlobalStub replaces global functions", function () {
        GlobalOverride.createScope(() => {

            var overrideWasCalled = false;
            GlobalOverride.replace("globalFunction", TeddyMocks, () => overrideWasCalled = true);

            TeddyMocks.globalFunction();
            ok(overrideWasCalled, "Overridden method was called");
        });
    });
}