import api, { ExternalEndpointNotAllowedError, route } from '@forge/api';

// Fetch issues from jira in a specific project
export const getIssues = async (payload, requestContext) => {
  // console.log(`Payload: ${JSON.stringify(payload)}`);
  // console.log(`Request Context: ${JSON.stringify(requestContext)}`);

  const projectKey = payload.context.jira.projectKey;
  const label = payload.label ? payload.label : null;

  // console.log(`Fetching issues for project: KAN and label: ${label}`);
  const jql = label ? `project=${projectKey} AND labels=${label}` : `project=${projectKey}`;
  const response = await api.asApp().requestJira(route`/rest/api/3/search?jql=${jql}`);
  const data = await response.json();
  
  // Issue Data: Start time, end time, storypoint estimation, team id
  const cleanedIssueData = await extractIssueDetails(data);

  // All User Ids and Names
  const cleanedUserData = getAllUsers(cleanedIssueData);

  const cleanedIssueAndUserData = {
    "issues": cleanedIssueData,
    "users": cleanedUserData
  }

  console.log(`ajk-response: issues ${JSON.stringify(cleanedIssueData)}`)
  console.log(`ajk-response: users ${JSON.stringify(cleanedUserData)}`)


  console.log(`ajk-response: users and issues: ${JSON.stringify(cleanedIssueAndUserData)}`)

  return cleanedIssueAndUserData;
}

export const getValidTeamId = async (issues) => {
  var creatorId = ""

  for (const issueData of issues) {
    if (issueData.creatorId) {
      creatorId = issueData.creatorId
      break
    }
  }

  const response = await api.asApp().requestJira(route`/rest/api/3/user/groups?accountId=${creatorId}`);
  const data = await response.json();

  return data.groupId
}


// Get the user's name and accountId from user
export const getAllUsers = (userData) => {

  const userIds = []

  for (const user of userData) {
    if (user.assigneeId) {
      userIds.push(user.assigneeId)
    }

    if (user.creatorId) {
      userIds.push(user.creatorId)
    }
  }

  const uniqIds = [...new Map(userIds.map(item => [item.id, item])).values()]

  return uniqIds


  // const response1 = await api.asUser().requestJira(route`/rest/api/3/group`, {
  //   method: 'POST',
  //   headers: {
  //     'Accept': 'application/json',
  //     'Content-Type': 'application/json'
  //   },
  //   body: bodyData
  // })

  // const response = await api.asApp().requestJira(route`/rest/api/3/group/member?groupId=${groupId}`);


  // const data = await response.json();
  
  // console.log(`data is ${JSON.stringify(data)}`)

  // const userData = await extractUserDetails(data)
  // return userData;
}


// export const extractUserDetails = async (data) => {
//   return data.values.map(userData => {
//     return {
//       name: userData.displayName,
//       accountId: userData.accountId,
//     };
//   });
// }

// Extract :
// - starttime, 
// - endtime, 
// - storypointestimate 
// - assigneeId
// - displayNem
// and team details from every issue
export const extractIssueDetails = async (data) => {
  // console.log(`Extracting issue details from response: ${JSON.stringify(data)}`);


  const extractedFields = data.issues.map(issue => {
    const fields = issue.fields;
    return {
      startTime: fields.customfield_10015,
      endTime: fields.duedate,
      storyPointEstimate: fields.customfield_10016,// dont worry abotu this now
      team: fields.customfield_10001,
      assigneeName: fields.displayName,
      creatorId: {
        id: fields.creator.accountId,
        name: fields.creator.displayName,
        avatarUrl: fields.creator.avatarUrls["32x32"]
      },
      assigneeId: fields.assignee ? {
        id: fields.assignee.accountId,
        name: fields.assignee.displayName,
        avatarUrl: fields.assignee.avatarUrls["32x32"]
       } : null,
    };
  });

  return extractedFields;


  // return data.issues.map(issue => ({
  //     key: issue.key,
  //     summary: issue.fields.summary
  // }));
}


