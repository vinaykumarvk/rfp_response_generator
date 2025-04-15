--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

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

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: embedding_categories; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.embedding_categories (
    category text NOT NULL,
    count integer DEFAULT 0
);


ALTER TABLE public.embedding_categories OWNER TO neondb_owner;

--
-- Name: embeddings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.embeddings (
    id integer NOT NULL,
    category text NOT NULL,
    requirement text NOT NULL,
    response text NOT NULL,
    reference text,
    payload text NOT NULL,
    embedding public.vector(1536) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.embeddings OWNER TO neondb_owner;

--
-- Name: embeddings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.embeddings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.embeddings_id_seq OWNER TO neondb_owner;

--
-- Name: embeddings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.embeddings_id_seq OWNED BY public.embeddings.id;


--
-- Name: excel_requirement_responses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.excel_requirement_responses (
    id integer NOT NULL,
    category text NOT NULL,
    requirement text NOT NULL,
    final_response text,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    rating integer,
    model_provider text,
    openai_response text,
    anthropic_response text,
    deepseek_response text,
    username text,
    rfp_name text,
    requirement_id text,
    uploaded_by text,
    moa_response text,
    similar_questions text,
    feedback text
);


ALTER TABLE public.excel_requirement_responses OWNER TO neondb_owner;

--
-- Name: excel_requirement_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.excel_requirement_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.excel_requirement_responses_id_seq OWNER TO neondb_owner;

--
-- Name: excel_requirement_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.excel_requirement_responses_id_seq OWNED BY public.excel_requirement_responses.id;


--
-- Name: excel_requirements; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.excel_requirements (
    id integer NOT NULL,
    requirement text NOT NULL,
    category text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.excel_requirements OWNER TO neondb_owner;

--
-- Name: excel_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.excel_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.excel_requirements_id_seq OWNER TO neondb_owner;

--
-- Name: excel_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.excel_requirements_id_seq OWNED BY public.excel_requirements.id;


--
-- Name: reference_responses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.reference_responses (
    id integer NOT NULL,
    response_id integer NOT NULL,
    category text NOT NULL,
    requirement text NOT NULL,
    response text NOT NULL,
    reference text,
    score real NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.reference_responses OWNER TO neondb_owner;

--
-- Name: reference_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.reference_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reference_responses_id_seq OWNER TO neondb_owner;

--
-- Name: reference_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.reference_responses_id_seq OWNED BY public.reference_responses.id;


--
-- Name: rfp_responses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.rfp_responses (
    id integer NOT NULL,
    client_name text NOT NULL,
    client_industry text NOT NULL,
    rfp_title text NOT NULL,
    rfp_id text,
    submission_date date NOT NULL,
    budget_range text,
    project_summary text NOT NULL,
    company_name text NOT NULL,
    point_of_contact text NOT NULL,
    company_strengths text,
    selected_template text NOT NULL,
    customizations text,
    generated_content text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    last_updated timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rfp_responses OWNER TO neondb_owner;

--
-- Name: rfp_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.rfp_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rfp_responses_id_seq OWNER TO neondb_owner;

--
-- Name: rfp_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.rfp_responses_id_seq OWNED BY public.rfp_responses.id;


--
-- Name: similar_questions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.similar_questions (
    id integer NOT NULL,
    requirement_id integer,
    similar_question text NOT NULL,
    similarity_score double precision,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.similar_questions OWNER TO neondb_owner;

--
-- Name: similar_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.similar_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.similar_questions_id_seq OWNER TO neondb_owner;

--
-- Name: similar_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.similar_questions_id_seq OWNED BY public.similar_questions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: embeddings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.embeddings ALTER COLUMN id SET DEFAULT nextval('public.embeddings_id_seq'::regclass);


--
-- Name: excel_requirement_responses id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.excel_requirement_responses ALTER COLUMN id SET DEFAULT nextval('public.excel_requirement_responses_id_seq'::regclass);


--
-- Name: excel_requirements id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.excel_requirements ALTER COLUMN id SET DEFAULT nextval('public.excel_requirements_id_seq'::regclass);


--
-- Name: reference_responses id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reference_responses ALTER COLUMN id SET DEFAULT nextval('public.reference_responses_id_seq'::regclass);


--
-- Name: rfp_responses id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rfp_responses ALTER COLUMN id SET DEFAULT nextval('public.rfp_responses_id_seq'::regclass);


--
-- Name: similar_questions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.similar_questions ALTER COLUMN id SET DEFAULT nextval('public.similar_questions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: embedding_categories embedding_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.embedding_categories
    ADD CONSTRAINT embedding_categories_pkey PRIMARY KEY (category);


--
-- Name: embeddings embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.embeddings
    ADD CONSTRAINT embeddings_pkey PRIMARY KEY (id);


--
-- Name: excel_requirement_responses excel_requirement_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.excel_requirement_responses
    ADD CONSTRAINT excel_requirement_responses_pkey PRIMARY KEY (id);


--
-- Name: excel_requirements excel_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.excel_requirements
    ADD CONSTRAINT excel_requirements_pkey PRIMARY KEY (id);


--
-- Name: reference_responses reference_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reference_responses
    ADD CONSTRAINT reference_responses_pkey PRIMARY KEY (id);


--
-- Name: rfp_responses rfp_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rfp_responses
    ADD CONSTRAINT rfp_responses_pkey PRIMARY KEY (id);


--
-- Name: similar_questions similar_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.similar_questions
    ADD CONSTRAINT similar_questions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: embeddings_category_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX embeddings_category_idx ON public.embeddings USING btree (category);


--
-- Name: embeddings_embedding_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX embeddings_embedding_idx ON public.embeddings USING hnsw (embedding public.vector_cosine_ops) WITH (m='8', ef_construction='32');


--
-- Name: embeddings_requirement_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX embeddings_requirement_idx ON public.embeddings USING gin (requirement public.gin_trgm_ops);


--
-- Name: embeddings_vector_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX embeddings_vector_idx ON public.embeddings USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: reference_responses reference_responses_response_id_excel_requirement_responses_id_; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reference_responses
    ADD CONSTRAINT reference_responses_response_id_excel_requirement_responses_id_ FOREIGN KEY (response_id) REFERENCES public.excel_requirement_responses(id) ON DELETE CASCADE;


--
-- Name: similar_questions similar_questions_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.similar_questions
    ADD CONSTRAINT similar_questions_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.excel_requirements(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

