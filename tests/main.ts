// @format

import * as tape from "tape"

import * as config from "./config/production"
import {
  default as Client,
  AuthenticationResponse,
  ErrorResponse,
} from "../src/index"

function test(
  msg: string,
  cb: (t: any, pass: () => void, fail: (err: string) => void) => void,
): void {
  tape(msg, { timeout: 10 * 1000 }, t => {
    cb(
      t,
      () =>
        deleteResources()
          .then(() => t.end())
          .catch(err => t.fail(err)),
      err =>
        deleteResources()
          .then(() => t.fail(err))
          .catch(() => t.fail(err)),
    )
  })
}

function deleteResources(): Promise<void> {
  const client = newClient()
  return client.apiRequest({
    method: "DELETE",
    path: "/resources",
    jwt: client.generateAccessToken({ su: true }).token,
  })
}

test("createUser", (t, pass, fail) => {
  const user = randomUser()

  newClient()
    .createUser(user)
    .then(res => {
      resemblesUser(t, res, user)
      pass()
    })
    .catch(fail)
})

test("createUsers", (t, pass, fail) => {
  const alice = randomUser()
  const bob = randomUser()

  newClient()
    .createUsers({ users: [alice, bob] })
    .then(res => {
      t.is(res.length, 2)
      resemblesUser(t, res[0], alice)
      resemblesUser(t, res[1], bob)
      pass()
    })
    .catch(fail)
})

test("uptadeUser", (t, pass, fail) => {
  const client = newClient()
  const user = randomUser()

  const updates = {
    id: user.id,
    name: randomString(),
    avatarURL: `https://${randomString()}`,
    customData: { foo: randomString(), edited: true },
  }

  client
    .createUser(user)
    .then(() => client.updateUser(updates))
    // FIXME why do we get the user back from a create, but not an update?
    .then(() => client.getUser({ id: user.id }))
    .then(res => {
      resemblesUser(t, res, updates)
      pass()
    })
    .catch(fail)
})

test("deleteUser", (t, pass, fail) => {
  const client = newClient()
  const user = randomUser()

  client
    .createUser(user)
    .then(() => client.deleteUser({ userId: user.id })) // FIXME userId -> id
    .then(() => {
      client
        .getUser({ id: user.id })
        .then(() => fail("expected getUser to fail"))
        .catch(err => {
          t.is(err.status, 404)
          t.is(err.error, "services/chatkit/not_found/user_not_found")
          pass()
        })
    })
    .catch(fail)
})

test("getUser", (t, pass, fail) => {
  const client = newClient()
  const user = randomUser()

  client
    .createUser(user)
    .then(() => client.getUser({ id: user.id }))
    .then(res => {
      resemblesUser(t, res, user)
      pass()
    })
    .catch(fail)
})

test("getUsers", (t, pass, fail) => {
  const client = newClient()

  const alice = randomUser()
  const bob = randomUser()
  const carol = randomUser()
  const dave = randomUser()

  const users = [alice, bob, carol, dave].sort((x, y) => compare(x.id, y.id))

  Promise.all(users.map(user => client.createUser(user)))
    // FIXME getUsers should take the same pagination params as the API
    .then(() => client.getUsers())
    .then(res => {
      t.is(res.length, 4)
      res.sort((x: any, y: any) => compare(x.id, y.id))
      for (let i = 0; i < 4; i++) {
        resemblesUser(t, res[i], users[i])
      }
      pass()
    })
    .catch(fail)
})

function resemblesUser(t: any, actual: any, expected: User): void {
  t.is(actual.id, expected.id)
  t.is(actual.name, expected.name)
  t.is(actual.avatar_url, expected.avatarURL) // FIXME naming
  t.deepEquals(actual.custom_data, expected.customData) // FIXME naming
  // TODO timestamps
}

function newClient(): Client {
  return new Client({
    instanceLocator: config.INSTANCE_LOCATOR,
    key: config.INSTANCE_KEY,
  })
}

function randomUser(): User {
  return {
    id: randomString(),
    name: randomString(),
    avatarURL: `https://${randomString()}`,
    customData: { foo: randomString() },
  }
}

function randomString(): string {
  return Math.random()
    .toString(36)
    .substring(2)
}

function compare(x: any, y: any): number {
  return x > y ? 1 : x < y ? -1 : 0
}

// TYPES (these should probably live in the SDK proper)

type User = {
  id: string
  name: string
  avatarURL?: string
  customData?: any
}
