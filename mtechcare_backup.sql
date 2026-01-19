--
-- PostgreSQL database dump
--

\restrict dlNNyvBCsl8QeJwnfHHJUdHbRHYLy6YnPP2wsTFrSZZFL5e3w7MjrWMsUaGMRIg

-- Dumped from database version 15.15 (Debian 15.15-1.pgdg13+1)
-- Dumped by pg_dump version 15.15 (Debian 15.15-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP INDEX IF EXISTS public.idx_service_requests_timestamp;
DROP INDEX IF EXISTS public.idx_service_requests_created_at;
ALTER TABLE IF EXISTS ONLY public.service_requests DROP CONSTRAINT IF EXISTS service_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_users DROP CONSTRAINT IF EXISTS admin_users_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_users DROP CONSTRAINT IF EXISTS admin_users_email_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS "UQ_1e3d0240b49c40521aaeb953293";
ALTER TABLE IF EXISTS ONLY public.admins DROP CONSTRAINT IF EXISTS "UQ_051db7d37d478a69a7432df1479";
ALTER TABLE IF EXISTS ONLY public.admins DROP CONSTRAINT IF EXISTS "PK_e3b38270c97a854c48d2e80874e";
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS "PK_a3ffb1c0c8416b9fc6f907b7433";
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.service_requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.admins ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.admin_users ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.service_requests_id_seq;
DROP TABLE IF EXISTS public.service_requests;
DROP SEQUENCE IF EXISTS public.admins_id_seq;
DROP TABLE IF EXISTS public.admins;
DROP SEQUENCE IF EXISTS public.admin_users_id_seq;
DROP TABLE IF EXISTS public.admin_users;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password text NOT NULL,
    role character varying(50) DEFAULT 'admin'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_login_at timestamp without time zone
);


--
-- Name: admin_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_users_id_seq OWNED BY public.admin_users.id;


--
-- Name: admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admins (
    id integer NOT NULL,
    password character varying NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "lastLoginAt" timestamp without time zone,
    name character varying NOT NULL,
    email character varying NOT NULL
);


--
-- Name: admins_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admins_id_seq OWNED BY public.admins.id;


--
-- Name: service_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_requests (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    mobile character varying(50) NOT NULL,
    device character varying(255) NOT NULL,
    device_display_name character varying(255) NOT NULL,
    other_device character varying(255),
    location_type character varying(50) NOT NULL,
    location character varying(255) NOT NULL,
    current_location character varying(255),
    manual_location character varying(255),
    description text,
    language character varying(10) NOT NULL,
    date_time character varying(100) NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: service_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_requests_id_seq OWNED BY public.service_requests.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    "phoneNumber" character varying NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "lastLoginAt" timestamp without time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: admin_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users ALTER COLUMN id SET DEFAULT nextval('public.admin_users_id_seq'::regclass);


--
-- Name: admins id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins ALTER COLUMN id SET DEFAULT nextval('public.admins_id_seq'::regclass);


--
-- Name: service_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_requests ALTER COLUMN id SET DEFAULT nextval('public.service_requests_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_users (id, name, email, password, role, is_active, created_at, last_login_at) FROM stdin;
1	Super Admin	admin@mtechcare.com	$2b$10$dYfk8tF5FCjNZ6w4tfs37e.5JA7n6/Oz4rOX2eaabv9IedMh2mYxy	admin	t	2025-12-31 01:51:46.819169	2026-01-05 03:19:01.261
\.


--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admins (id, password, "isActive", "createdAt", "updatedAt", "lastLoginAt", name, email) FROM stdin;
\.


--
-- Data for Name: service_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_requests (id, name, mobile, device, device_display_name, other_device, location_type, location, current_location, manual_location, description, language, date_time, "timestamp", created_at) FROM stdin;
1	John Doe	+966501234567	Mobile	Mobile	\N	manual	Dammam, Saudi Arabia	\N	Dammam, Saudi Arabia	Screen is cracked	en	12/25/2024, 3:45:30 PM	2024-12-25 18:15:30.123	2026-01-05 03:57:15.414933
2	MOHAMMED SHAFIN C	7994648644	Desktop	Desktop	\N	current	https://www.google.com/maps?q=11.2564576,75.8040022	https://www.google.com/maps?q=11.2564576,75.8040022	\N	haoi adich poyu	en	05/01/2026, 04:11:04	2026-01-05 04:11:04.099	2026-01-05 04:11:04.138929
3	John Doe	+966501234544	Mobile	Mobile	\N	manual	Dammam, Saudi Arabia	\N	Dammam, Saudi Arabia	Screen is cracked	en	12/25/2024, 3:45:30 PM	2024-12-25 18:15:30.123	2026-01-05 04:23:36.959729
4	John Doe	+966501234544	Mobile	Mobile	\N	manual	Dammam, Saudi Arabia	\N	Dammam, Saudi Arabia	Screen is cracked	en	12/25/2024, 3:45:30 PM	2024-12-25 18:15:30.123	2026-01-05 04:27:19.593409
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, "phoneNumber", "isActive", "createdAt", "updatedAt", "lastLoginAt") FROM stdin;
1	568958390	t	2025-12-31 01:27:45.416166	2025-12-31 01:27:45.416166	2025-12-31 01:27:45.412
2	551234567	t	2026-01-05 04:03:58.742259	2026-01-05 04:03:58.742259	2026-01-05 04:03:58.738
3	574847653	t	2026-01-05 04:04:15.803616	2026-01-05 04:04:15.803616	2026-01-05 04:04:15.804
\.


--
-- Name: admin_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_users_id_seq', 1, true);


--
-- Name: admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admins_id_seq', 1, false);


--
-- Name: service_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.service_requests_id_seq', 4, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: admins PK_e3b38270c97a854c48d2e80874e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT "PK_e3b38270c97a854c48d2e80874e" PRIMARY KEY (id);


--
-- Name: admins UQ_051db7d37d478a69a7432df1479; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT "UQ_051db7d37d478a69a7432df1479" UNIQUE (email);


--
-- Name: users UQ_1e3d0240b49c40521aaeb953293; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_1e3d0240b49c40521aaeb953293" UNIQUE ("phoneNumber");


--
-- Name: admin_users admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: service_requests service_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_pkey PRIMARY KEY (id);


--
-- Name: idx_service_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_requests_created_at ON public.service_requests USING btree (created_at);


--
-- Name: idx_service_requests_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_requests_timestamp ON public.service_requests USING btree ("timestamp");


--
-- PostgreSQL database dump complete
--

\unrestrict dlNNyvBCsl8QeJwnfHHJUdHbRHYLy6YnPP2wsTFrSZZFL5e3w7MjrWMsUaGMRIg

