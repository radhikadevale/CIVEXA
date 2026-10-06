const express = require("express");
const multer = require("multer");
const path = require("path");
const db = require("../database/db");

const router = express.Router();


// =========================
// IMAGE UPLOAD SETTINGS
// =========================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(
            null,
            path.join(__dirname, "../uploads")
        );

    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() + "-" + file.originalname;

        cb(null, uniqueName);

    }

});


const upload = multer({

    storage: storage,

    limits: {
        fileSize: 5 * 1024 * 1024
    }

});


// =========================
// CREATE NEW ISSUE
// =========================

router.post(
    "/",
    upload.single("issueImage"),
    async (req, res) => {

        try {

            const {
                user_id,
                title,
                category,
                description,
                location,
                city,
                landmark,
                priority,
                is_anonymous
            } = req.body;


            // =========================
            // CHECK REQUIRED FIELDS
            // =========================

            if (
                !user_id ||
                !title ||
                !category ||
                !description ||
                !location
            ) {

                return res.status(400).json({

                    message:
                        "Required issue information is missing."

                });

            }


            // =========================
            // IMAGE PATH
            // =========================

            const imagePath =
                req.file
                    ? "/uploads/" + req.file.filename
                    : null;


            // =========================
            // GENERATE REPORT CODE
            // =========================

            const reportCode =
                "CVX-" +
                new Date().getFullYear() +
                "-" +
                Math.floor(
                    1000 + Math.random() * 9000
                );


            // =========================
            // INSERT ISSUE
            // =========================

            const [result] =
                await db.query(

                    `INSERT INTO issues
                    (
                        report_code,
                        user_id,
                        title,
                        category,
                        description,
                        location,
                        city,
                        landmark,
                        priority,
                        is_anonymous,
                        image_path
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

                    [

                        reportCode,

                        user_id,

                        title,

                        category,

                        description,

                        location,

                        city || null,

                        landmark || null,

                        priority || "medium",

                        is_anonymous === true ||
                        is_anonymous === "true",

                        imagePath

                    ]

                );


            // =========================
            // SUCCESS RESPONSE
            // =========================

            res.status(201).json({

                message:
                    "Issue submitted successfully!",

                report_id:
                    reportCode,

                issue_id:
                    result.insertId,

                image_path:
                    imagePath

            });


        } catch (error) {

            console.error(
                "Create issue error:",
                error
            );


            res.status(500).json({

                message:
                    "Failed to submit issue."

            });

        }

    }
);


// =========================
// TRACK ISSUE BY REPORT CODE
// =========================

router.get(
    "/track/:reportCode",
    async (req, res) => {

        try {

            const { reportCode } =
                req.params;


            const [issues] =
                await db.query(

                    `SELECT
                        i.issue_id,
                        i.report_code,
                        i.title,
                        i.category,
                        i.description,
                        i.location,
                        i.city,
                        i.landmark,
                        i.priority,
                        i.status,
                        i.progress,
                        i.image_path,
                        i.created_at,
                        i.updated_at,
                        i.department_id,
                        d.department_name
                     FROM issues i
                     LEFT JOIN departments d
                        ON i.department_id = d.department_id
                     WHERE i.report_code = ?`,

                    [reportCode]

                );


            if (issues.length === 0) {

                return res.status(404).json({

                    message:
                        "Issue not found."

                });

            }


            res.json({

                message:
                    "Issue found successfully.",

                issue:
                    issues[0]

            });


        } catch (error) {

            console.error(
                "Track issue error:",
                error
            );


            res.status(500).json({

                message:
                    "Failed to track issue."

            });

        }

    }
);
// =========================
// GET MY REPORTS
// =========================

router.get(
    "/my-reports/:userId",
    async (req, res) => {

        try {

            const { userId } =
                req.params;


            const [issues] =
                await db.query(

                    `SELECT
                        issue_id,
                        report_code,
                        title,
                        category,
                        description,
                        location,
                        city,
                        landmark,
                        priority,
                        status,
                        progress,
                        image_path,
                        created_at,
                        updated_at
                     FROM issues
                     WHERE user_id = ?
                     ORDER BY created_at DESC`,

                    [userId]

                );


            res.json({

                message:
                    "Reports fetched successfully.",

                reports:
                    issues

            });


        } catch (error) {

            console.error(
                "Get my reports error:",
                error
            );


            res.status(500).json({

                message:
                    "Failed to fetch reports."

            });

        }

    }
);

// =========================
// PUBLIC BROWSE ISSUES
// =========================

router.get(
    "/",
    async (req, res) => {

        try {

            const [issues] =
                await db.query(

                    `SELECT
                        i.issue_id,
                        i.report_code,
                        i.title,
                        i.category,
                        i.description,
                        i.location,
                        i.city,
                        i.priority,
                        i.status,
                        i.progress,
                        i.image_path,
                        i.created_at,
                        d.department_name,
                        COUNT(s.support_id) AS supporter_count

                     FROM issues i

                     LEFT JOIN departments d
                        ON i.department_id =
                           d.department_id

                     LEFT JOIN supports s
                        ON i.issue_id =
                           s.issue_id

                     GROUP BY
                        i.issue_id,
                        i.report_code,
                        i.title,
                        i.category,
                        i.description,
                        i.location,
                        i.city,
                        i.priority,
                        i.status,
                        i.progress,
                        i.image_path,
                        i.created_at,
                        d.department_name

                     ORDER BY
                        i.created_at DESC`


                );


            res.json({

                message:
                    "Browse issues fetched successfully.",

                issues:
                    issues

            });


        } catch (error) {

            console.error(
                "Browse issues error:",
                error
            );


            res.status(500).json({

                message:
                    "Failed to fetch browse issues."

            });

        }

    }
);

// =========================
// ADMIN DASHBOARD STATISTICS
// =========================

router.get(
    "/admin/stats",
    async (req, res) => {

        try {

            const [totalResult] = await db.query(
                `SELECT COUNT(*) AS total
                 FROM issues`
            ); 
             const [supportResult] = await db.query(
            `SELECT COUNT(*) AS total_supports
             FROM supports`
            );

            const [pendingResult] = await db.query(
                `SELECT COUNT(*) AS pending
                 FROM issues
                 WHERE status = 'pending'`
            );

            const [progressResult] = await db.query(
                `SELECT COUNT(*) AS in_progress
                 FROM issues
                 WHERE status = 'in-progress'`
            );

            const [resolvedResult] = await db.query(
                `SELECT COUNT(*) AS resolved
                 FROM issues
                 WHERE status = 'resolved'`
            );


            res.json({

                total: totalResult[0].total,

                pending: pendingResult[0].pending,

                in_progress:
                    progressResult[0].in_progress,

                resolved:
                    resolvedResult[0].resolved

            });


        } catch (error) {

            console.error(
                "Admin stats error:",
                error
            );

            res.status(500).json({

                message:
                    "Failed to fetch admin statistics."

            });

        }

    }
);

// =========================
// ADMIN RECENT ISSUES
// =========================

router.get(
    "/admin/recent",
    async (req, res) => {

        try {

            const [issues] = await db.query(
                `SELECT
                    issue_id,
                    report_code,
                    title,
                    category,
                    location,
                    city,
                    priority,
                    status,
                    created_at
                 FROM issues
                 ORDER BY created_at DESC
                 LIMIT 5`
            );

            res.json({
                message:
                    "Recent issues fetched successfully.",
                issues: issues
            });

        } catch (error) {

            console.error(
                "Admin recent issues error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to fetch recent issues."
            });

        }

    }
);

// =========================
// ADMIN HIGH PRIORITY ISSUES
// =========================

router.get(
    "/admin/high-priority",
    async (req, res) => {

        try {

            const [issues] = await db.query(
                `SELECT
                    issue_id,
                    report_code,
                    title,
                    category,
                    location,
                    city,
                    priority,
                    status
                 FROM issues
                 WHERE priority = 'high'
                 ORDER BY created_at DESC
                 LIMIT 5`
            );

            res.json({
                message:
                    "High priority issues fetched successfully.",
                issues: issues
            });

        } catch (error) {

            console.error(
                "Admin high priority error:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to fetch high priority issues."
            });

        }

    }
);



// =========================
// ADMIN ALL ISSUES
// =========================

router.get("/admin/all", async (req, res) => {

    try {

        const [issues] = await db.query(
            `SELECT
                i.issue_id,
                i.report_code,
                i.title,
                i.category,
                i.description,
                i.location,
                i.city,
                i.landmark,
                i.priority,
                i.status,
                i.progress,
                i.image_path,
                i.is_anonymous,
                i.created_at,
                i.updated_at,
                i.department_id,
                d.department_name
             FROM issues i
             LEFT JOIN departments d
                ON i.department_id = d.department_id
             ORDER BY i.created_at DESC`
        );

        res.json({
            message: "All issues fetched successfully.",
            issues: issues
        });

    } catch (error) {

        console.error(
            "Admin all issues error:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch all issues."
        });

    }

});

// =========================
// ADMIN UPDATE ISSUE
// =========================

router.put("/admin/update/:issueId", async (req, res) => {

    try {

        const { issueId } = req.params;

        const {
            priority,
            status,
            department_id,
            progress
        } = req.body;


        // Check required values
        if (
            !priority ||
            !status ||
            progress === undefined
        ) {

            return res.status(400).json({
                message: "Required update information is missing."
            });

        }


        // Update issue in MySQL
        const [result] = await db.query(
            `UPDATE issues
             SET
                priority = ?,
                status = ?,
                department_id = ?,
                progress = ?
             WHERE issue_id = ?`,
            [
                priority,
                status,
                department_id || null,
                progress,
                issueId
            ]
        );


        // Check whether issue exists
        if (result.affectedRows === 0) {

            return res.status(404).json({
                message: "Issue not found."
            });

        }


        res.json({
            message: "Issue updated successfully.",
            issue_id: issueId
        });


    } catch (error) {

        console.error(
            "Admin update issue error:",
            error
        );

        res.status(500).json({
            message: "Failed to update issue."
        });

    }

});

// =========================
// ADMIN DEPARTMENT DETAILS
// =========================

router.get("/admin/departments", async (req, res) => {

    try {

        const [departments] = await db.query(
            `SELECT
                d.department_id,
                d.department_name,

                COUNT(
                    CASE
                        WHEN i.status != 'resolved'
                        THEN i.issue_id
                    END
                ) AS active_issues,

                COUNT(
                    CASE
                        WHEN i.status = 'resolved'
                        THEN i.issue_id
                    END
                ) AS resolved_issues

             FROM departments d

             LEFT JOIN issues i
                ON d.department_id = i.department_id

             GROUP BY
                d.department_id,
                d.department_name

             ORDER BY
                d.department_id`
        );


        res.json({
            message: "Department details fetched successfully.",
            departments: departments
        });


    } catch (error) {

        console.error(
            "Admin departments error:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch department details."
        });

    }

});


// =========================
// ADMIN ANALYTICS
// =========================

router.get("/admin/analytics", async (req, res) => {

    try {

        // =========================
        // TOTAL ISSUES
        // =========================

        const [totalResult] = await db.query(
            `SELECT COUNT(*) AS total_issues
             FROM issues`
        );

        // =========================
        // COMMUNITY SUPPORT
        // =========================

        const [supportResult] = await db.query(
        `SELECT COUNT(*) AS total_supports
        FROM supports`
        );

        // =========================
        // STATUS COUNTS
        // =========================

        const [statusResult] = await db.query(
            `SELECT
                status,
                COUNT(*) AS issue_count
             FROM issues
             GROUP BY status`
        );


        let totalIssues =
    Number(totalResult[0].total_issues);
    let communitySupport =
    Number(supportResult[0].total_supports);

let resolvedIssues = 0;
let pendingIssues = 0;
let inProgressIssues = 0;
let verifiedIssues = 0;


statusResult.forEach(function(row) {

    if (row.status === "resolved") {

        resolvedIssues =
            Number(row.issue_count);

    }

    else if (row.status === "pending") {

        pendingIssues =
            Number(row.issue_count);

    }

    else if (row.status === "in-progress") {

        inProgressIssues =
            Number(row.issue_count);

    }

    else if (row.status === "verified") {

        verifiedIssues =
            Number(row.issue_count);

    }

});

        // =========================
        // RESOLUTION RATE
        // =========================

        let resolutionRate = 0;

        if (totalIssues > 0) {

            resolutionRate =
                Math.round(
                    (resolvedIssues / totalIssues) * 100
                );

        }


        // =========================
        // AVERAGE RESOLUTION TIME
        // =========================
        // For resolved issues:
        // updated_at - created_at

        const [resolutionResult] = await db.query(
            `SELECT
                AVG(
                    TIMESTAMPDIFF(
                        DAY,
                        created_at,
                        updated_at
                    )
                ) AS average_days
             FROM issues
             WHERE status = 'resolved'`
        );


        let averageResolutionTime =
            Number(
                resolutionResult[0].average_days || 0
            );


        averageResolutionTime =
            Math.round(
                averageResolutionTime * 10
            ) / 10;


        // =========================
        // SEND ANALYTICS DATA
        // =========================

        res.json({

            message:
                "Analytics data fetched successfully.",

            totalIssues:
                totalIssues,

            resolvedIssues:
                resolvedIssues,

            pendingIssues:
                pendingIssues,

            inProgressIssues:
                inProgressIssues,

            verifiedIssues:
                verifiedIssues,

            resolutionRate:
                resolutionRate,

            averageResolutionTime:
                averageResolutionTime,

            communitySupport:
            communitySupport

        });


    } catch (error) {

        console.error(
            "Admin analytics error:",
            error
        );

        res.status(500).json({

            message:
                "Failed to fetch analytics data."

        });

    }

});


// =========================
// ADMIN ANALYTICS CATEGORIES
// =========================

router.get("/admin/analytics/categories", async (req, res) => {

    try {

        const [categories] = await db.query(
            `SELECT
                category,
                COUNT(*) AS issue_count
             FROM issues
             GROUP BY category
             ORDER BY issue_count DESC`
        );


        res.json({

            message:
                "Category analytics fetched successfully.",

            categories: categories

        });


    } catch (error) {

        console.error(
            "Category analytics error:",
            error
        );

        res.status(500).json({

            message:
                "Failed to fetch category analytics."

        });

    }

});

// =========================
// ADMIN ANALYTICS PRIORITY
// =========================

router.get("/admin/analytics/priority", async (req, res) => {

    try {

        const [priorityResult] = await db.query(
            `SELECT
                priority,
                COUNT(*) AS issue_count
             FROM issues
             GROUP BY priority
             ORDER BY
                CASE priority
                    WHEN 'high' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'low' THEN 3
                END`
        );


        res.json({

            message:
                "Priority analytics fetched successfully.",

            priorities:
                priorityResult

        });


    } catch (error) {

        console.error(
            "Priority analytics error:",
            error
        );

        res.status(500).json({

            message:
                "Failed to fetch priority analytics."

        });

    }

});


// =========================
// ADMIN ANALYTICS TREND
// =========================

router.get("/admin/analytics/trend", async (req, res) => {

    try {

        const [trendResult] = await db.query(
    `SELECT
        YEAR(created_at) AS year_number,
        MONTH(created_at) AS month_number,
        MONTHNAME(created_at) AS month_name,
        COUNT(*) AS issue_count
     FROM issues
     WHERE created_at >= DATE_SUB(
         CURDATE(),
         INTERVAL 5 MONTH
     )
     GROUP BY
        YEAR(created_at),
        MONTH(created_at),
        MONTHNAME(created_at)
     ORDER BY
        year_number,
        month_number`
);

        res.json({

            message:
                "Issue trend fetched successfully.",

            trend:
                trendResult

        });


    } catch (error) {

        console.error(
            "Issue trend error:",
            error
        );

        res.status(500).json({

            message:
                "Failed to fetch issue trend."

        });

    }

});

// =========================
// SUPPORT AN ISSUE
// =========================

router.post("/support/:issueId", async (req, res) => {
    try {
        const issueId = req.params.issueId;
        const userId = req.body.user_id;

        if (!userId) {
            return res.status(400).json({
                message: "User ID is required."
            });
        }

        // Check whether this user already supported this issue
        const [existingSupport] = await db.query(
            `SELECT support_id
             FROM supports
             WHERE issue_id = ?
             AND user_id = ?`,
            [issueId, userId]
        );

        if (existingSupport.length > 0) {
            return res.status(400).json({
                message: "You have already supported this issue."
            });
        }

        // Add support
        await db.query(
            `INSERT INTO supports
             (issue_id, user_id)
             VALUES (?, ?)`,
            [issueId, userId]
        );

        res.json({
            message: "Issue supported successfully."
        });

    } catch (error) {
        console.error("Support issue error:", error);

        res.status(500).json({
            message: "Failed to support issue."
        });
    }
});

// Get supporter count for an issue
router.get("/support/:issueId", async (req, res) => {

    try {

        const issueId = req.params.issueId;

        const [result] = await db.query(
            `SELECT COUNT(*) AS total_supports
             FROM supports
             WHERE issue_id = ?`,
            [issueId]
        );

        res.json({
            total_supports:
                Number(result[0].total_supports)
        });

    } catch (error) {

        console.error(
            "Support count error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to fetch supporter count."
        });

    }

});
// Get issues supported by a user
router.get("/support/user/:userId", async (req, res) => {

    try {

        const userId = req.params.userId;

        const [result] = await db.query(
            `SELECT issue_id
             FROM supports
             WHERE user_id = ?`,
            [userId]
        );

        res.json({
            total_supports: result.length,

            supported_issue_ids:
                result.map(row =>
                    Number(row.issue_id)
                )
        });

    } catch (error) {

        console.error(
            "User support count error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to fetch supported issues."
        });
    }
});

// =========================
// SUBMIT FEEDBACK
// =========================

router.post("/feedback", async (req, res) => {

    try {

        const {
            user_id,
            name,
            email,
            rating,
            feedback_type,
            message
        } = req.body;


        // Convert text rating to number
        const ratingMap = {
            "Excellent": 5,
            "Good": 4,
            "Average": 3,
            "Needs Improvement": 2
        };

        const numericRating =
            ratingMap[rating] || Number(rating);


        // Validate fields
        if (
            !name ||
            !email ||
            !rating ||
            !feedback_type ||
            !message
        ) {
            return res.status(400).json({
                message: "Please fill in all feedback fields."
            });
        }


        // Save feedback in database
        await db.query(
            `INSERT INTO feedback
            (
                user_id,
                name,
                email,
                rating,
                feedback_type,
                message
            )
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                user_id || null,
                name,
                email,
                numericRating,
                feedback_type,
                message
            ]
        );


        res.status(201).json({
            message: "Feedback submitted successfully."
        });

    } catch (error) {

        console.error(
            "Submit feedback error:",
            error
        );

        res.status(500).json({
            message: "Failed to submit feedback."
        });

    }

});

// =========================
// GET ALL FEEDBACK
// =========================

router.get("/admin/feedback", async (req, res) => {

    try {

        const [feedback] = await db.query(
            `SELECT
                feedback_id,
                user_id,
                name,
                email,
                rating,
                feedback_type,
                message,
                created_at
             FROM feedback
             ORDER BY created_at DESC`
        );

        res.json({
            message: "Feedback fetched successfully.",
            feedback: feedback
        });

    } catch (error) {

        console.error(
            "Admin feedback error:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch feedback."
        });

    }

});

// =========================
// GET MY FEEDBACK
// =========================

router.get("/feedback/user/:userId", async (req, res) => {

    try {

        const { userId } = req.params;

        const [feedback] = await db.query(
            `SELECT
                feedback_id,
                user_id,
                name,
                email,
                rating,
                feedback_type,
                message,
                created_at
             FROM feedback
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [userId]
        );

        res.json({
            message: "User feedback fetched successfully.",
            feedback: feedback
        });

    } catch (error) {

        console.error(
            "Get user feedback error:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch user feedback."
        });

    }

});


router.post("/contact", async (req, res) => {
    try {
        const {
            user_id,
            name,
            email,
            subject,
            message
        } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                message: "Please fill in all contact fields."
            });
        }

        await db.query(
            `INSERT INTO contact_messages
            (
                user_id,
                name,
                email,
                subject,
                message
            )
            VALUES (?, ?, ?, ?, ?)`,
            [
                user_id || null,
                name,
                email,
                subject,
                message
            ]
        );

        res.status(201).json({
            message: "Your message has been sent successfully."
        });

    } catch (error) {
        console.error(
            "Contact message error:",
            error
        );

        res.status(500).json({
            message: "Failed to send contact message."
        });
    }
});

router.get("/admin/contact-messages", async (req, res) => {
    try {
        const [messages] = await db.query(
            `SELECT
                message_id,
                user_id,
                name,
                email,
                subject,
                message,
                status,
                created_at
             FROM contact_messages
             ORDER BY created_at DESC`
        );

        res.json({
            message: "Contact messages fetched successfully.",
            messages: messages
        });

    } catch (error) {

        console.error(
            "Admin contact messages error:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch contact messages."
        });
    }
});

router.put("/admin/contact-messages/:messageId", async (req, res) => {
    try {
        const { messageId } = req.params;
        const { status } = req.body;

        const allowedStatuses = [
            "new",
            "read",
            "resolved"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid contact message status."
            });
        }

        const [result] = await db.query(
            `UPDATE contact_messages
             SET status = ?
             WHERE message_id = ?`,
            [
                status,
                messageId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Contact message not found."
            });
        }

        res.json({
            message: "Contact message status updated successfully.",
            message_id: messageId,
            status: status
        });

    } catch (error) {

        console.error(
            "Update contact message status error:",
            error
        );

        res.status(500).json({
            message: "Failed to update contact message status."
        });

    }
});

module.exports = router;