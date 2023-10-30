import testAppSetup from '../../../../common/ably-common/test-resources/test-app-setup.json';

export async function createSandboxAblyAPIKey() {
  const response = await fetch('https://sandbox-rest.ably.io/apps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testAppSetup.post_apps),
  });

  if (!response.ok) {
    throw new Error(`Response not OK (${response.status})`);
  }

  const testApp = await response.json();
  return testApp.keys[0].keyStr;
}
