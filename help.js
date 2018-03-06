const log = require("debug")("ak-sender");

const poll_for_rebuild = (api, poll_url, fn) =>
  api
    .get(poll_url)
    .then(
      resp =>
        resp.body.finished
          ? fn(null, true)
          : setTimeout(() => poll_for_rebuild(api, poll_url, fn), 100)
    );

const wait_for_rebuild = async (api, mailing_id) => {
  const deferred_rebuild = await api.post(`mailer/${mailing_id}/rebuild`);

  const poll_url = deferred_rebuild.header.location.replace(
    process.env.AK_BASE,
    ""
  );

  log(
    "Initiated polling for rebubild of %s – poll url is %s",
    mailing_id,
    poll_url
  );

  return await new Promise((resolve, reject) =>
    poll_for_rebuild(
      api,
      poll_url,
      (err, ok) => (err ? reject(err) : resolve(ok))
    )
  );
};

module.exports = {
  hasAllKeys: (obj, keys) =>
    keys.filter(key => obj[key] === undefined).length == 0,

  cloneAndSend: async (api, mailing_id, subject, html) => {
    log("Cloning mailing %s", mailing_id);

    const cloned = await api.post(`mailer/${mailing_id}/copy`);
    const split_location = cloned.header["location"].split("/");
    const new_mailing_id = split_location[split_location.length - 2];

    log("Copied mailing %s – got new mailing %s.", mailing_id, new_mailing_id);

    const patched = await api
      .patch(`mailer/${new_mailing_id}`)
      .send({ subject, html });

    log(
      "Patched mailing %s with subject %s, now rebuilding",
      new_mailing_id,
      subject
    );

    const rebuilt = await wait_for_rebuild(api, new_mailing_id);
    const queued = await api.post(`mailer/${new_mailing_id}/queue`);
    return queued;
  }
};
