TeddyMocks
==========

A simple mock framework for Javascript, written in and optimized for TypeScript development.

Overview
==========
Teddy Mocks is a JavaScript mock framework written in TypeScript. It is optimized for TypeScript developers, and 
uses fluent lambda syntax to support strong-typing and refactoring. It should feel familiar to anybody who has 
used Moq or Rhino Mocks in the past.

Teddy Mocks supports both natural (instance-based) stubs, as well as global overrides. The global overrides
allow you to mock things like XmlHttpRequest by replacing the browser's default implementation. But it safely
reverts the override when the test finishes. Global overrides also replace constructor implementations.

Example
==========
Usage examples can be gleaned from the unit test project. Here are some sample tests using QUnit:

    class ObjectToStub {

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
    
    // Test illustrating stubs:
    test("Stub correctly asserts with no arguments", function () {

        var expected = 123;
        var stub = new Stub<ObjectToStub>(ObjectToStub);

        stub.stubs(m => m.bar()).andReturns(expected);
        equal(stub.object.bar(), expected, "Correct value returned");

        ok(stub.assertsThat(s => s.bar()).wasCalled(), "bar was called one time");
    });
    
    // Test illustrating GlobalStubs:
    test("GlobalStub replaces implementation", function () {
        GlobalOverride.createScope(() => {

            var globalStub = new GlobalStub<XMLHttpRequest>("XMLHttpRequest");
            globalStub.stubs(s => s.send(undefined), false);

            var request = new XMLHttpRequest();
            request.send(undefined);

            ok(globalStub.assertsThat(s => s.send(undefined)).wasCalled(), "Globally overriden stub was created successfully");
        });
    });
    
    
