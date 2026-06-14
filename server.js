const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { Client, types } = require("pg");

// Parse timestamp without timezone (OID 1114) as UTC Date/string to avoid local timezone shift
types.setTypeParser(1114, function(stringValue) {
  return stringValue ? new Date(stringValue.replace(" ", "T") + "Z") : null;
});

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Track active wiki document viewers: docId -> Map(socketId -> user)
  const activeDocViewers = new Map();

  io.on("connection", (socket) => {
    // Room subscriptions
    socket.on("join_user", (userId) => {
      socket.join(`user:${userId}`);
    });

    socket.on("join_project", (projectId) => {
      socket.join(`project:${projectId}`);
    });

    socket.on("join_task", (taskId) => {
      socket.join(`task:${taskId}`);
    });

    socket.on("leave_task", (taskId) => {
      socket.leave(`task:${taskId}`);
    });

    socket.on("join_sprint", (sprintId) => {
      socket.join(`sprint:${sprintId}`);
    });

    socket.on("join_board", (room) => {
      socket.join(room);
    });

    socket.on("leave_board", (room) => {
      socket.leave(room);
    });

    // Collaborative document reading presence
    socket.on("join_doc", ({ docId, user }) => {
      socket.join(`doc:${docId}`);
      if (!activeDocViewers.has(docId)) {
        activeDocViewers.set(docId, new Map());
      }
      activeDocViewers.get(docId).set(socket.id, user);

      // Emit updated list of active viewers
      const viewers = Array.from(activeDocViewers.get(docId).values());
      io.to(`doc:${docId}`).emit("readers_updated", viewers);
    });

    socket.on("leave_doc", ({ docId }) => {
      socket.leave(`doc:${docId}`);
      if (activeDocViewers.has(docId)) {
        activeDocViewers.get(docId).delete(socket.id);
        const viewers = Array.from(activeDocViewers.get(docId).values());
        io.to(`doc:${docId}`).emit("readers_updated", viewers);
      }
    });

    // Collaborative card dragging user cursors
    socket.on("drag_cursor_move", (data) => {
      socket.to(`project:${data.projectId}`).emit("drag_cursor_updated", data);
    });

    socket.on("drag_cursor_end", (data) => {
      socket.to(`project:${data.projectId}`).emit("drag_cursor_ended", data);
    });

    // Chat subscriptions & typing indicators
    socket.on("join_chat_group", (chatGroupId) => {
      socket.join(`chatGroup:${chatGroupId}`);
    });

    socket.on("leave_chat_group", (chatGroupId) => {
      socket.leave(`chatGroup:${chatGroupId}`);
    });

    socket.on("typing", (data) => {
      // Broadcast to others in the chat group room: { chatGroupId, userId, userName }
      socket.to(`chatGroup:${data.chatGroupId}`).emit("typing_indicator", data);
    });

    socket.on("stop_typing", (data) => {
      // Broadcast to others in the chat group room: { chatGroupId, userId }
      socket.to(`chatGroup:${data.chatGroupId}`).emit("stop_typing_indicator", data);
    });

    socket.on("disconnect", () => {
      // Clean up collaborative reader states
      for (const [docId, viewersMap] of activeDocViewers.entries()) {
        if (viewersMap.has(socket.id)) {
          viewersMap.delete(socket.id);
          const viewers = Array.from(viewersMap.values());
          io.to(`doc:${docId}`).emit("readers_updated", viewers);
        }
      }
    });
  });

  // Setup Postgres LISTEN/NOTIFY client
  let dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/Zeta?schema=public";
  if (dbUrl.includes("@db:")) {
    dbUrl = dbUrl.replace("@db:", "@localhost:");
  }

  const pgClient = new Client({ connectionString: dbUrl });

  try {
    await pgClient.connect();
    console.log("> Connected to PostgreSQL for Real-Time Pub/Sub.");

    // Setup Postgres trigger function and triggers on boot automatically
    await pgClient.query(`
      CREATE OR REPLACE FUNCTION notify_realtime() RETURNS trigger AS $$
      DECLARE
        payload JSONB;
        proj_id TEXT := NULL;
        tsk_id TEXT := NULL;
        spr_id TEXT := NULL;
        row_id TEXT := NULL;
        usr_id TEXT := NULL;
      BEGIN
        IF TG_OP = 'DELETE' THEN
          row_id := OLD.id::TEXT;
        ELSE
          row_id := NEW.id::TEXT;
        END IF;

        IF TG_TABLE_NAME = 'Task' THEN
          IF TG_OP = 'DELETE' THEN
            proj_id := OLD."projectId";
            spr_id := OLD."sprintId";
          ELSE
            proj_id := NEW."projectId";
            spr_id := NEW."sprintId";
          END IF;
        ELSIF TG_TABLE_NAME = 'Comment' THEN
          IF TG_OP = 'DELETE' THEN
            tsk_id := OLD."taskId";
            spr_id := OLD."sprintId";
          ELSE
            tsk_id := NEW."taskId";
            spr_id := NEW."sprintId";
          END IF;
        ELSIF TG_TABLE_NAME = 'Attachment' THEN
          IF TG_OP = 'DELETE' THEN
            tsk_id := OLD."taskId";
            spr_id := OLD."sprintId";
          ELSE
            tsk_id := NEW."taskId";
            spr_id := NEW."sprintId";
          END IF;
        ELSIF TG_TABLE_NAME = 'Sprint' THEN
          IF TG_OP = 'DELETE' THEN
            proj_id := OLD."projectId";
          ELSE
            proj_id := NEW."projectId";
          END IF;
        ELSIF TG_TABLE_NAME = 'ProjectMember' THEN
          IF TG_OP = 'DELETE' THEN
            proj_id := OLD."projectId";
            usr_id := OLD."userId";
          ELSE
            proj_id := NEW."projectId";
            usr_id := NEW."userId";
          END IF;
        ELSIF TG_TABLE_NAME = 'Notification' THEN
          IF TG_OP = 'DELETE' THEN
            usr_id := OLD."userId";
          ELSE
            usr_id := NEW."userId";
          END IF;
        ELSIF TG_TABLE_NAME = 'TaskAssignment' THEN
          IF TG_OP = 'DELETE' THEN
            tsk_id := OLD."taskId";
            usr_id := OLD."userId";
          ELSE
            tsk_id := NEW."taskId";
            usr_id := NEW."userId";
          END IF;
        ELSIF TG_TABLE_NAME = 'AuditLog' THEN
          IF TG_OP = 'DELETE' THEN
            tsk_id := OLD."taskId";
            usr_id := OLD."userId";
          ELSE
            tsk_id := NEW."taskId";
            usr_id := NEW."userId";
          END IF;
        ELSIF TG_TABLE_NAME = 'AuditLogComment' THEN
          IF TG_OP = 'DELETE' THEN
            SELECT "taskId" INTO tsk_id FROM "AuditLog" WHERE id = OLD."auditLogId";
            usr_id := OLD."userId";
            spr_id := OLD."auditLogId";
          ELSE
            SELECT "taskId" INTO tsk_id FROM "AuditLog" WHERE id = NEW."auditLogId";
            usr_id := NEW."userId";
            spr_id := NEW."auditLogId";
          END IF;
        ELSIF TG_TABLE_NAME = 'Document' THEN
          IF TG_OP = 'DELETE' THEN
            proj_id := OLD."projectId";
            usr_id := OLD."authorId";
          ELSE
            proj_id := NEW."projectId";
            usr_id := NEW."authorId";
          END IF;
        ELSIF TG_TABLE_NAME = 'ChatMessage' THEN
          IF TG_OP = 'DELETE' THEN
            tsk_id := OLD."chatGroupId";
            usr_id := OLD."senderId";
          ELSE
            tsk_id := NEW."chatGroupId";
            usr_id := NEW."senderId";
          END IF;
        ELSIF TG_TABLE_NAME = 'ChatMember' THEN
          IF TG_OP = 'DELETE' THEN
            tsk_id := OLD."chatGroupId";
            usr_id := OLD."userId";
          ELSE
            tsk_id := NEW."chatGroupId";
            usr_id := NEW."userId";
          END IF;
        ELSIF TG_TABLE_NAME = 'ChatGroup' THEN
          IF TG_OP = 'DELETE' THEN
            row_id := OLD.id::TEXT;
          ELSE
            row_id := NEW.id::TEXT;
          END IF;
        END IF;

        payload := jsonb_build_object(
          'table', TG_TABLE_NAME,
          'action', TG_OP,
          'id', row_id,
          'projectId', proj_id,
          'taskId', tsk_id,
          'sprintId', spr_id,
          'userId', usr_id
        );

        PERFORM pg_notify('zeta_realtime', payload::text);
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pgClient.query(`
      CREATE OR REPLACE FUNCTION notify_project_delete() RETURNS TRIGGER AS $$
      DECLARE
        payload JSONB;
      BEGIN
        payload := jsonb_build_object(
          'table', 'Project',
          'action', 'DELETE',
          'id', OLD.id::TEXT,
          'projectId', OLD.id::TEXT,
          'projectName', OLD.name
        );
        PERFORM pg_notify('zeta_realtime', payload::text);
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Attach Table triggers
    const tablesToTrigger = ["Task", "Comment", "Attachment", "Sprint", "Project", "ProjectMember", "Notification", "TaskAssignment", "AuditLog", "AuditLogComment", "Document", "ChatGroup", "ChatMember", "ChatMessage"];
    for (const table of tablesToTrigger) {
      await pgClient.query(`DROP TRIGGER IF EXISTS trg_${table.toLowerCase()}_realtime ON "${table}";`);
      await pgClient.query(`DROP TRIGGER IF EXISTS trg_${table.toLowerCase()}_delete_realtime ON "${table}";`);
      
      if (table === "Project") {
        await pgClient.query(`
          CREATE TRIGGER trg_project_realtime
          AFTER INSERT OR UPDATE ON "Project"
          FOR EACH ROW EXECUTE FUNCTION notify_realtime();
        `);
        await pgClient.query(`
          CREATE TRIGGER trg_project_delete_realtime
          AFTER DELETE ON "Project"
          FOR EACH ROW EXECUTE FUNCTION notify_project_delete();
        `);
      } else {
        await pgClient.query(`
          CREATE TRIGGER trg_${table.toLowerCase()}_realtime
          AFTER INSERT OR UPDATE OR DELETE ON "${table}"
          FOR EACH ROW EXECUTE FUNCTION notify_realtime();
        `);
      }
    }

    console.log("> Real-time PostgreSQL DB triggers synchronized successfully.");

    await pgClient.query("LISTEN zeta_realtime");

    pgClient.on("notification", async (msg) => {
      try {
        const payload = JSON.parse(msg.payload);
        const { table, action, id, projectId, taskId, sprintId, userId, projectName } = payload;

        if (table === "Task") {
          if (action === "DELETE") {
            // Look up the actor who deleted so we can tell others
            let deletedBy = null;
            if (userId) {
              const deleterRes = await pgClient.query(
                'SELECT name, email FROM "User" WHERE id = $1', [userId]
              );
              if (deleterRes.rows[0]) {
                deletedBy = deleterRes.rows[0].name || deleterRes.rows[0].email;
              }
            }
            const payload = { id, deletedBy };
            io.to(`project:${projectId}`).emit("task_deleted", payload);
            io.to(`task:${id}`).emit("task_deleted", payload);
          } else {
            const taskRes = await pgClient.query(`
              SELECT t.*,
                (SELECT json_agg(json_build_object(
                  'userId', ta."userId",
                  'role', ta."role",
                  'user', json_build_object(
                    'id', u.id,
                    'name', u.name,
                    'email', u.email,
                    'image', u.image
                  )
                )) FROM "TaskAssignment" ta 
                   JOIN "User" u ON ta."userId" = u.id 
                   WHERE ta."taskId" = t.id
                ) as assignments
              FROM "Task" t 
              WHERE t.id = $1
            `, [id]);

            if (taskRes.rows[0]) {
              const task = taskRes.rows[0];
              if (action === "INSERT") {
                io.to(`project:${task.projectId}`).emit("task_created", task);
              } else {
                io.to(`project:${task.projectId}`).emit("task_updated", task);
                io.to(`task:${task.id}`).emit("task_updated", task);
              }
            }
          }
        }

        else if (table === "Comment") {
          if (action === "DELETE") {
            if (taskId) io.to(`task:${taskId}`).emit("comment_deleted", { id });
            if (sprintId) io.to(`sprint:${sprintId}`).emit("comment_deleted", { id });
          } else {
            const commentRes = await pgClient.query(`
              SELECT c.*, 
                json_build_object(
                  'id', u.id,
                  'name', u.name,
                  'email', u.email,
                  'image', u.image
                ) as user
              FROM "Comment" c
              JOIN "User" u ON c."userId" = u.id
              WHERE c.id = $1
            `, [id]);

            if (commentRes.rows[0]) {
              const comment = commentRes.rows[0];
              if (comment.taskId) {
                io.to(`task:${comment.taskId}`).emit("comment_created", comment);
              }
              if (comment.sprintId) {
                io.to(`sprint:${comment.sprintId}`).emit("sprint_comment_created", comment);
              }
            }
          }
        }

        else if (table === "Attachment") {
          if (action === "DELETE") {
            if (taskId) io.to(`task:${taskId}`).emit("attachment_deleted", { id });
            if (sprintId) io.to(`sprint:${sprintId}`).emit("attachment_deleted", { id });
          } else {
            const attachRes = await pgClient.query(`
              SELECT a.*,
                json_build_object(
                  'id', u.id,
                  'name', u.name,
                  'email', u.email,
                  'image', u.image
                ) as user
              FROM "Attachment" a
              JOIN "User" u ON a."userId" = u.id
              WHERE a.id = $1
            `, [id]);

            if (attachRes.rows[0]) {
              const attachment = attachRes.rows[0];
              if (attachment.taskId) {
                io.to(`task:${attachment.taskId}`).emit("attachment_created", attachment);
              }
              if (attachment.sprintId) {
                io.to(`sprint:${attachment.sprintId}`).emit("attachment_created", attachment);
              }
            }
          }
        }

        else if (table === "Sprint") {
          if (action === "DELETE") {
            io.to(`project:${projectId}`).emit("sprint_deleted", { id });
          } else {
            const sprintRes = await pgClient.query('SELECT * FROM "Sprint" WHERE id = $1', [id]);
            if (sprintRes.rows[0]) {
              const sprint = sprintRes.rows[0];
              if (action === "INSERT") {
                io.to(`project:${sprint.projectId}`).emit("sprint_created", sprint);
              } else {
                io.to(`project:${sprint.projectId}`).emit("sprint_updated", sprint);
              }
            }
          }
        }

        else if (table === "ProjectMember") {
          if (action === "INSERT") {
            io.to(`user:${userId}`).emit("added_to_project", { projectId });
          } else if (action === "DELETE") {
            let pName = "the project";
            try {
              const projRes = await pgClient.query('SELECT name FROM "Project" WHERE id = $1', [projectId]);
              if (projRes.rows[0]) pName = projRes.rows[0].name;
            } catch(e) {}
            io.to(`user:${userId}`).emit("removed_from_project", { projectId, projectName: pName });
          }
        }

        else if (table === "Project") {
          if (action === "DELETE") {
            io.to(`project:${id}`).emit("project_deleted", { projectId: id, projectName });
          } else {
            const projRes = await pgClient.query('SELECT * FROM "Project" WHERE id = $1', [id]);
            if (projRes.rows[0]) {
              io.to(`project:${id}`).emit("project_updated", projRes.rows[0]);
            }
          }
        }

        else if (table === "Document") {
          if (action === "DELETE") {
            let deletedBy = "an administrator";
            try {
              const auditRes = await pgClient.query(`
                SELECT u.name, u.email 
                FROM "AuditLog" al 
                JOIN "User" u ON al."userId" = u.id 
                WHERE al.action = 'DELETE_DOCUMENT' 
                ORDER BY al."createdAt" DESC 
                LIMIT 1
              `);
              if (auditRes.rows[0]) {
                const user = auditRes.rows[0];
                deletedBy = `${user.name} (${user.email || 'Admin'})`;
              }
            } catch(e) {}
            io.to(`project:${projectId}`).emit("document_deleted", { id, deletedBy });
          } else {
            const docRes = await pgClient.query(`
              SELECT d.*, 
                COALESCE(
                  (SELECT json_agg(ta."userId") 
                   FROM "DocLink" dl 
                   JOIN "TaskAssignment" ta ON dl."taskId" = ta."taskId" 
                   WHERE dl."documentId" = d.id), 
                  '[]'::json
                ) as "assigneeIds"
              FROM "Document" d 
              WHERE d.id = $1
            `, [id]);
            if (docRes.rows[0]) {
              const doc = docRes.rows[0];
              if (action === "INSERT") {
                io.to(`project:${doc.projectId}`).emit("document_created", doc);
              } else {
                io.to(`project:${doc.projectId}`).emit("document_updated", doc);
              }
            }
          }
        }

        else if (table === "Notification") {
          if (action === "INSERT") {
            const notifRes = await pgClient.query('SELECT * FROM "Notification" WHERE id = $1', [id]);
            if (notifRes.rows[0]) {
              const notif = notifRes.rows[0];
              io.to(`user:${notif.userId}`).emit("notification_received", notif);
            }
          }
        }

        else if (table === "TaskAssignment") {
          io.to(`user:${userId}`).emit("task_assignment_changed", { taskId, action });
          const taskRes = await pgClient.query('SELECT "projectId" FROM "Task" WHERE id = $1', [taskId]);
          if (taskRes.rows[0]) {
            const projId = taskRes.rows[0].projectId;
            io.to(`project:${projId}`).emit("task_updated", { id: taskId });
          }
        }

        else if (table === "AuditLog") {
          if (taskId) {
            if (action === "INSERT") {
              const logRes = await pgClient.query(`
                SELECT al.*, 
                  json_build_object(
                    'id', u.id,
                    'name', u.name,
                    'email', u.email,
                    'image', u.image
                  ) as user,
                  '[]'::json as comments
                FROM "AuditLog" al
                JOIN "User" u ON al."userId" = u.id
                WHERE al.id = $1
              `, [id]);
              if (logRes.rows[0]) {
                const log = logRes.rows[0];
                io.to(`task:${taskId}`).emit("timeline_log_created", log);
              }
            } else {
              io.to(`task:${taskId}`).emit("timeline_updated", { taskId });
            }
          }
        }

        else if (table === "AuditLogComment") {
          if (taskId) {
            if (action === "DELETE") {
              io.to(`task:${taskId}`).emit("timeline_comment_deleted", { id, auditLogId: sprintId });
            } else {
              const commentRes = await pgClient.query(`
                SELECT alc.*, 
                  json_build_object(
                    'id', u.id,
                    'name', u.name,
                    'email', u.email,
                    'image', u.image
                  ) as user
                FROM "AuditLogComment" alc
                JOIN "User" u ON alc."userId" = u.id
                WHERE alc.id = $1
              `, [id]);
              if (commentRes.rows[0]) {
                const comment = commentRes.rows[0];
                io.to(`task:${taskId}`).emit("timeline_comment_created", comment);
              }
            }
          }
        }

        else if (table === "ChatMessage") {
          if (action === "DELETE") {
            io.to(`chatGroup:${taskId}`).emit("chat_message_deleted", { id, chatGroupId: taskId });
            try {
              const membersRes = await pgClient.query('SELECT "userId" FROM "ChatMember" WHERE "chatGroupId" = $1', [taskId]);
              for (const row of membersRes.rows) {
                io.to(`user:${row.userId}`).emit("chat_message_removed", { id, chatGroupId: taskId });
              }
            } catch(e) {}
          } else {
            const msgRes = await pgClient.query(`
              SELECT cm.*, 
                json_build_object(
                  'id', u.id,
                  'name', u.name,
                  'email', u.email,
                  'image', u.image
                ) as sender,
                COALESCE(
                  (SELECT json_agg(json_build_object(
                    'id', a.id,
                    'name', a.name,
                    'url', a.url,
                    'size', a.size,
                    'type', a.type
                  )) FROM "Attachment" a WHERE a."chatMessageId" = cm.id),
                  '[]'::json
                ) as attachments
              FROM "ChatMessage" cm
              JOIN "User" u ON cm."senderId" = u.id
              WHERE cm.id = $1
            `, [id]);

            if (msgRes.rows[0]) {
              const message = msgRes.rows[0];
              if (action === "INSERT") {
                io.to(`chatGroup:${taskId}`).emit("chat_message_created", message);
              } else {
                io.to(`chatGroup:${taskId}`).emit("chat_message_updated", message);
              }

              try {
                const membersRes = await pgClient.query('SELECT "userId" FROM "ChatMember" WHERE "chatGroupId" = $1', [taskId]);
                for (const row of membersRes.rows) {
                  io.to(`user:${row.userId}`).emit("chat_message_received", { chatGroupId: taskId, message, action });
                }
              } catch(e) {}
            }
          }
        }

        else if (table === "ChatGroup") {
          if (action === "DELETE") {
            io.to(`chatGroup:${id}`).emit("chat_group_deleted", { chatGroupId: id });
            try {
              const membersRes = await pgClient.query('SELECT "userId" FROM "ChatMember" WHERE "chatGroupId" = $1', [id]);
              for (const row of membersRes.rows) {
                io.to(`user:${row.userId}`).emit("chat_group_removed_global", { chatGroupId: id });
              }
            } catch(e) {}
          } else {
            const groupRes = await pgClient.query(`
              SELECT cg.*,
                COALESCE(
                  (SELECT json_agg(json_build_object(
                    'id', cm.id,
                    'userId', cm."userId",
                    'isAdmin', cm."isAdmin",
                    'mutedUntil', cm."mutedUntil",
                    'user', json_build_object(
                      'id', u.id,
                      'name', u.name,
                      'email', u.email,
                      'image', u.image
                    )
                  )) FROM "ChatMember" cm
                     JOIN "User" u ON cm."userId" = u.id
                     WHERE cm."chatGroupId" = cg.id
                  ),
                  '[]'::json
                ) as members
              FROM "ChatGroup" cg
              WHERE cg.id = $1
            `, [id]);

            if (groupRes.rows[0]) {
              const group = groupRes.rows[0];
              io.to(`chatGroup:${id}`).emit("chat_group_updated", group);
              
              for (const member of group.members) {
                io.to(`user:${member.userId}`).emit("chat_group_updated_global", group);
              }
            }
          }
        }

        else if (table === "ChatMember") {
          io.to(`chatGroup:${taskId}`).emit("chat_member_changed", { chatGroupId: taskId, userId, action });
          
          try {
            const groupRes = await pgClient.query(`
              SELECT cg.*,
                COALESCE(
                  (SELECT json_agg(json_build_object(
                    'id', cm.id,
                    'userId', cm."userId",
                    'isAdmin', cm."isAdmin",
                    'mutedUntil', cm."mutedUntil",
                    'user', json_build_object(
                      'id', u.id,
                      'name', u.name,
                      'email', u.email,
                      'image', u.image
                    )
                  )) FROM "ChatMember" cm
                     JOIN "User" u ON cm."userId" = u.id
                     WHERE cm."chatGroupId" = cg.id
                  ),
                  '[]'::json
                ) as members
              FROM "ChatGroup" cg
              WHERE cg.id = $1
            `, [taskId]);

            if (groupRes.rows[0]) {
              const group = groupRes.rows[0];
              if (action === "DELETE") {
                io.to(`user:${userId}`).emit("chat_group_removed_global", { chatGroupId: taskId });
              } else {
                io.to(`user:${userId}`).emit("chat_group_updated_global", group);
              }
              io.to(`chatGroup:${taskId}`).emit("chat_group_updated", group);
            }
          } catch(e) {}
        }

      } catch (err) {
        console.error("Error processing Postgres Pub/Sub notification:", err);
      }
    });

  } catch (dbErr) {
    console.error("Failed to connect pg client for listen/notify. Real-time updates offline:", dbErr);
  }

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
