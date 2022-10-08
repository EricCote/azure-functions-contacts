import pkg from "@azure/data-tables";
const { TableClient, TableEntity, TableServiceClient } = pkg;

import { v4 as uuidv4 } from "uuid";

export default async function contacts(context, req, ...args) {
  const tableClient = TableClient.fromConnectionString(
    process.env.AzureWebJobsStorage,
    "contact"
  );
  await tableClient.createTable();

  args.push(tableClient);

  switch (req.method) {
    case "GET":
      await get(context, req, tableClient);
      break;
    case "POST":
      await post(context, req, tableClient);
      break;
    case "PUT":
      await put(context, req, tableClient);
      break;
    case "DELETE":
      await del(context, req, tableClient);
      break;
    default:
      context.res = {
        status: 405,
        body: "Method not allowed",
      };
  }
}

async function get(context, req, tableClient) {
  const id = context.bindingData.id;
  if (id === "reset") {
    await deleteAll(tableClient);
    await createContacts(tableClient);
    return;
  }

  if (id) {
    const contact = await tableClient.getEntity("contact", id);
    context.res = {
      body: formatData(contact),
    };
  } else {
    const contacts = [];
    const query = tableClient.listEntities();
    for await (const contact of query) {
      contacts.push(contact);
    }
    context.res = {
      body: formatData(contacts),
    };
  }
}

async function post(context, req, tableClient) {
  delete req.body["id"];
  const entity = {
    partitionKey: "contact",
    rowKey: uuidv4(),
    ...req.body,
  };
  await tableClient.createEntity(entity);

  context.res = {
    status: 201,
    body: formatData(entity),
    location: `api/contacts/${entity.rowKey}`,
  };
}

async function put(context, req, tableClient) {
  const id = context.bindingData.id;
  delete req.body["id"];
  const entity = {
    ...req.body,
    partitionKey: "contact",
    rowKey: id,
  };
  await tableClient.updateEntity(entity);

  context.res = {
    body: formatData(entity),
  };
}

async function del(context, req, tableClient) {
  const id = context.bindingData.id;

  if (id === "all") {
    await deleteAll();
    context.res = {
      status: 204,
    };
    return;
  }

  await tableClient.deleteEntity("contact", id);

  context.res = {
    status: 204,
  };
}

async function deleteAll(tableClient) {
  const query = tableClient.listEntities();
  for await (const contact of query) {
    await tableClient.deleteEntity(contact.partitionKey, contact.rowKey);
  }
}

async function createContacts(tableClient) {
  const contacts = [
    {
      id: 1,
      firstName: "Eric",
      lastName: "Côté",
      email: "ericcote@reactAcademy.live",
    },
    {
      id: 2,
      firstName: "Satya",
      lastName: "Nadella",
      email: "satyan@microsoft.com",
    },
    {
      id: 3,
      firstName: "Mark",
      lastName: "Zuckerberg",
      email: "zuck@fb.com",
    },
    {
      id: 4,
      firstName: "Jeff",
      lastName: "Bezos",
      email: "jeff@amazon.com",
    },
    {
      id: 5,
      firstName: "Tim",
      lastName: "Cook",
      email: "tcook@apple.com",
    },
    {
      id: 6,
      firstName: "Sundar",
      lastName: "Pichai",
      email: "sundar@google.com",
    },
  ];

  for (const contact of contacts) {
    delete contact["id"];
    const entity = {
      partitionKey: "contact",
      rowKey: uuidv4(),
      ...contact,
    };
    await tableClient.createEntity(entity);
  }
}

function formatData(data) {
  if (Array.isArray(data)) {
    return data.map((row) => formatData(row));
  }
  if (typeof data === "object") {
    const { rowKey: id, firstName, lastName, email } = data;
    return { id, firstName, lastName, email };
  }
}
