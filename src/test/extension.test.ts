import * as assert from "assert";
import path from "path";
import * as vscode from "vscode";
import * as sinon from "sinon";
import * as jsonKeyCount from "../extension";

suite("JSON Key Count Test Suite", async () => {
  let sandbox: sinon.SinonSandbox;
  let updateDecorationsSpy: sinon.SinonSpy;
  let getEffectiveConfigStatusSpy: sinon.SinonSpy;

  setup(async () => {
    sandbox = sinon.createSandbox();
    updateDecorationsSpy = sinon.spy(jsonKeyCount, "updateDecorations");
    getEffectiveConfigStatusSpy = sinon.spy(
      jsonKeyCount,
      "getEffectiveConfigStatus"
    );

    const jsonKeyCountSettings =
      vscode.workspace.getConfiguration("jsonKeyCount");

    await jsonKeyCountSettings.update(
      "enabled",
      undefined,
      vscode.ConfigurationTarget.Global
    );
  });

  teardown(async () => {
    updateDecorationsSpy.restore();
    getEffectiveConfigStatusSpy.restore();
    sandbox.restore();

    const jsonKeyCountSettings =
      vscode.workspace.getConfiguration("jsonKeyCount");

    await jsonKeyCountSettings.update(
      "enabled",
      undefined,
      vscode.ConfigurationTarget.Global
    );
  });

  test("Should create proper decorations for simple json file", async () => {
    // Show the test fixture in editor
    await showFixture("simple-json.json");

    // Wait for debounce
    await wait(jsonKeyCount.DEBOUNCE_TIME + 50);

    // first return of spy func
    const returnVals = updateDecorationsSpy.returnValues[0];
    assert.strictEqual(returnVals.length, 4);

    const firstReturnVal = returnVals[0];
    const secondReturnVal = returnVals[1];
    const thirdReturnVal = returnVals[2];
    const fourthReturnVal = returnVals[3];

    assert.strictEqual(updateDecorationsSpy.callCount, 1);
    assert.strictEqual(firstReturnVal.renderOptions?.after?.contentText, "{3}");
    assert.strictEqual(
      secondReturnVal.renderOptions?.after?.contentText,
      "{3}"
    );
    assert.strictEqual(thirdReturnVal.renderOptions?.after?.contentText, "[2]");
    assert.strictEqual(
      fourthReturnVal.renderOptions?.after?.contentText,
      "{2}"
    );
  });

  test("Should create proper decorations for simple array file", async () => {
    // Show the test fixture in editor
    await showFixture("simple-array.json");

    // Wait for debounce
    await wait(jsonKeyCount.DEBOUNCE_TIME + 50);

    // first return of spy func
    const returnVals = updateDecorationsSpy.returnValues[0];

    assert.strictEqual(updateDecorationsSpy.callCount, 1);
    assert.strictEqual(returnVals.length, 2);

    const firstVal = returnVals[0];
    const secondVal = returnVals[1];

    assert.strictEqual(firstVal.renderOptions?.after?.contentText, "[2]");
    assert.strictEqual(secondVal.renderOptions?.after?.contentText, "{1}");
  });

  test("Should handle an empty json object", async () => {
    // Show the test fixture in editor
    await showFixture("empty-json.json");

    // Wait for debounce
    await wait(jsonKeyCount.DEBOUNCE_TIME + 50);

    // first return of spy func
    const returnVals = updateDecorationsSpy.returnValues[0];

    assert.strictEqual(updateDecorationsSpy.callCount, 1);
    assert.strictEqual(returnVals.length, 1);
    assert.strictEqual(returnVals[0].renderOptions?.after?.contentText, "{0}");
  });

  test("Should handle an empty json array", async () => {
    // Show the test fixture in editor
    await showFixture("empty-array.json");

    // Wait for debounce
    await wait(jsonKeyCount.DEBOUNCE_TIME + 50);

    // first return of spy func
    const returnVals = updateDecorationsSpy.returnValues[0];

    assert.strictEqual(updateDecorationsSpy.callCount, 1);
    assert.strictEqual(returnVals.length, 1);
    assert.strictEqual(returnVals[0].renderOptions?.after?.contentText, "[0]");
  });

  test("Should not execute for non json file", async () => {
    // Show the test fixture in editor
    await showFixture("test.js");

    // Wait for debounce
    await wait(jsonKeyCount.DEBOUNCE_TIME + 50);

    assert.strictEqual(updateDecorationsSpy.callCount, 0);
    assert.equal(updateDecorationsSpy.returnValues[0], undefined);
  });

  test("Should not execute when toggled off globaly", async () => {
    // turn off the extension globally
    const jsonKeyCountSettings =
      vscode.workspace.getConfiguration("jsonKeyCount");

    await jsonKeyCountSettings.update(
      "enabled",
      false,
      vscode.ConfigurationTarget.Global
    );

    // Show the test fixture in editor
    await showFixture("simple-json.json");

    // Wait for debounce
    await wait(jsonKeyCount.DEBOUNCE_TIME + 50);

    assert.strictEqual(updateDecorationsSpy.callCount, 1);
    assert.strictEqual(updateDecorationsSpy.returnValues[0].length, 0);

    // reset the config setting
    await jsonKeyCountSettings.update(
      "enabled",
      undefined,
      vscode.ConfigurationTarget.Global
    );
  });

  test("Should recalculate decorations on edit", async () => {
    assert.strictEqual(true, true);

    // Show the test fixture in editor
    const fixtureFile = await showFixture("simple-json.json");

    // Wait for debounce
    await wait(jsonKeyCount.DEBOUNCE_TIME + 50);

    fixtureFile.edit((editBuilder) => {
      editBuilder.insert(
        new vscode.Position(2, 0),
        '  "newKey": "newValue",\n'
      );
    });

    // Wait for debounce
    await wait(jsonKeyCount.DEBOUNCE_TIME + 50);

    vscode.commands.executeCommand("editor.action.insertLineAfter");

    // first return of spy func
    const returnVals = updateDecorationsSpy.returnValues[0];
    assert.strictEqual(returnVals.length, 4);

    const firstReturnVal = returnVals[0];
    const secondReturnVal = returnVals[1];
    const thirdReturnVal = returnVals[2];
    const fourthReturnVal = returnVals[3];

    assert.strictEqual(updateDecorationsSpy.callCount, 1);
    assert.strictEqual(firstReturnVal.renderOptions?.after?.contentText, "{4}");
    assert.strictEqual(
      secondReturnVal.renderOptions?.after?.contentText,
      "{3}"
    );
    assert.strictEqual(thirdReturnVal.renderOptions?.after?.contentText, "[2]");
    assert.strictEqual(
      fourthReturnVal.renderOptions?.after?.contentText,
      "{2}"
    );
  });
});

const wait = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const getFixturePath = (fixtureName: string) => {
  return path.join(
    __dirname,
    "..",
    "..",
    "src",
    "test",
    "fixtures",
    fixtureName
  );
};

const getFixtureUri = (fixtureName: string) => {
  return vscode.Uri.file(getFixturePath(fixtureName));
};

const showFixture = async (fixtureName: string): Promise<vscode.TextEditor> => {
  const fileUri = getFixtureUri(fixtureName);

  const doc = await vscode.workspace.openTextDocument(fileUri);
  return vscode.window.showTextDocument(doc);
};
