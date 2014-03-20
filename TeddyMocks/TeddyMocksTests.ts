/// <reference path="scripts/typings/qunit/qunit.d.ts" />

module TeddyMocks {

    class ObjectToStub {

        private barVal: number;

        constructor() {
            this.barVal = -1;
        }

        public foo() {
            throw "Should not be called";
        }
        public bar(): number {
            return this.barVal;
        }
    }

    test("Stub only accepts object types", function () {

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

    test("clear() resets state", function () {

        var expected = -1;
        var stub = new Stub<ObjectToStub>(ObjectToStub);

        stub.stubs(m => m.bar()).andReturns(expected);
        stub.clear();

        equal(stub.object.bar(), expected, "Correct value returned");
    });

    test("Stub uses callback", function () {

        var expected = 123;
        var stub = new Stub<ObjectToStub>(ObjectToStub);

        stub.stubs(m => m.bar()).withCallback(otm => expected);
        equal(stub.object.bar(), expected, "Correct value returned");
    });
}